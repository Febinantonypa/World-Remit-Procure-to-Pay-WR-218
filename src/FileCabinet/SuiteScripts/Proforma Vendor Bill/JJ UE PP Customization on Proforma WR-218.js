/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/email', 'N/format', 'N/record', 'N/search', 'N/ui/serverWidget', 'N/runtime', 'N/file'],
    /**
     * @param{email} email
     * @param{format} format
     * @param{record} record
     * @param{search} search
     * @param{serverWidget} serverWidget
     * @param{runtime} runtime
     * @param{file} file
     */
    (email, format, record, search, serverWidget, runtime, file) => {

        /**
         * @description Global variable for storing errors ----> for debugging purposes
         * @type {Array.<Error>}
         * @constant
         */
        const ERROR_STACK = [];

        /**
         * @description Common Try-Catch function, applies to Object contains methods/function
         * @param {Object.<string,Function|any>} DATA_OBJ Object contains methods/function
         * @param {String} OBJECT_NAME  Name of the Object
         * @returns {void}
         */
        const applyTryCatch = (DATA_OBJ, OBJECT_NAME) => {
            /**
             * @description  Try-Catch function
             * @param {Function} myfunction - reference to a function
             * @param {String} key - name of the function
             * @returns {Function|false}
             */
            const tryCatch = function tryCatch(myfunction, key) {
                return function () {
                    try {
                        return myfunction.apply(this, arguments);
                    } catch (e) {
                        log.error("error in " + key, e);
                        ERROR_STACK.push(e);
                        return false;
                    }
                };
            }
            //Iterate over keys in Object. If the values are function, then apply Try-Catch over them
            for (let key in DATA_OBJ)
                if (typeof DATA_OBJ[key] === "function")
                    DATA_OBJ[key] = tryCatch(DATA_OBJ[key], OBJECT_NAME + "." + key);
        }

        /**
         * @description Check whether the given parameter argument has value on it or is it empty.
         * ie, To check whether a value exists in parameter
         * @param {*} parameter parameter which contains/references some values
         * @param {*} parameterName name of the parameter, not mandatory
         * @returns {Boolean} true if there exist a value, else false
         */
        function checkForParameter(parameter, parameterName) {
            if (parameter !== "" && parameter !== null && parameter !== undefined && parameter !== false && parameter !== "null" && parameter !== "undefined" && parameter !== " " && parameter !== 'false') {
                return true;
            } else {
                if (parameterName)
                    log.debug('Empty Value found', 'Empty Value for parameter ' + parameterName);
                return false;
            }
        }

        const dataSets = {
            /**
             * @description Object referencing NetSuite Saved Search
             * @typedef {Object} SearchObj
             * @property {Object[]} filters - Filters Array in Search
             * @property {Object[]} columns - Columns Array in Search
             */
            /**
             * @description to format Saved Search column to key-value pair where each key represents each columns in Saved Search
             * @param {SearchObj} savedSearchObj
             * @param {void|String} priorityKey
             * @returns {Object.<String,SearchObj.columns>}
             */
            fetchSavedSearchColumn(savedSearchObj, priorityKey) {
                let columns = savedSearchObj.columns;
                let columnsData = {},
                    columnName = '';
                columns.forEach(function (result, counter) {
                    columnName = '';
                    if (result[priorityKey]) {
                        columnName += result[priorityKey];
                    } else {
                        if (result.summary)
                            columnName += result.summary + '__';
                        if (result.formula)
                            columnName += result.formula + '__';
                        if (result.join)
                            columnName += result.join + '__';
                        columnName += result.name;
                    }
                    columnsData[columnName] = result;
                });
                return columnsData;
            },
            /**
             * @description Representing each result in Final Saved Search Format
             * @typedef formattedEachSearchResult
             * @type {{value:any,text:any}}
             */
            /**
             * @description to fetch and format the single saved search result. ie, Search result of a single row containing both text and value for each columns
             * @param {Object[]} searchResult contains search result of a single row
             * @param {Object.<String,SearchObj.columns>} columns
             * @returns {Object.<String,formattedEachSearchResult>|{}}
             */
            formatSingleSavedSearchResult(searchResult, columns) {
                let responseObj = {};
                for (let column in columns)
                    responseObj[column] = {
                        value: searchResult.getValue(columns[column]),
                        text: searchResult.getText(columns[column])
                    };
                return responseObj;
            },
            /**
             * @description to iterate over and initiate format of each saved search result
             * @param {SearchObj} searchObj
             * @param {void|Object.<String,SearchObj.columns>} columns
             * @returns {[]|Object[]}
             */
            iterateSavedSearch(searchObj, columns) {
                if (!checkForParameter(searchObj))
                    return false;
                if (!checkForParameter(columns))
                    columns = dataSets.fetchSavedSearchColumn(searchObj);

                let response = [];
                let searchPageRanges;
                try {
                    searchPageRanges = searchObj.runPaged({
                        pageSize: 1000
                    });
                } catch (err) {
                    return [];
                }
                if (searchPageRanges.pageRanges.length < 1)
                    return [];

                let pageRangeLength = searchPageRanges.pageRanges.length;
                log.debug('pageRangeLength', pageRangeLength);

                for (let pageIndex = 0; pageIndex < pageRangeLength; pageIndex++)
                    searchPageRanges.fetch({
                        index: pageIndex
                    }).data.forEach(function (result) {
                        response.push(dataSets.formatSingleSavedSearchResult(result, columns));
                    });

                return response;
            },
            /**
             *
             * @param vendorBillId Internal Id of the Proforma Vendor Bill
             * @returns {*[]|Object[]} returns the proforma vender bill file attachment details
             */
            proformaAttachmentSearch(proformaId) {
                var customrecord_jj_proforma_bill_wr_218SearchObj = search.create({
                    type: "customrecord_jj_proforma_bill_wr_218",
                    filters:
                        [
                            ["internalid", "anyof", proformaId],
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "internalid",
                                join: "file",
                                label: "InternalID"
                            }),
                            search.createColumn({
                                name: "documentsize",
                                join: "file",
                                label: "SizeinKb"
                            })
                        ]
                });
                var searchResultCount = customrecord_jj_proforma_bill_wr_218SearchObj.runPaged().count;
                log.debug("customrecord_jj_proforma_bill_wr_218SearchObj result count", searchResultCount);
                return dataSets.iterateSavedSearch(customrecord_jj_proforma_bill_wr_218SearchObj, dataSets.fetchSavedSearchColumn(customrecord_jj_proforma_bill_wr_218SearchObj, 'label'));
            },
            /**
             * @description the saved search for all the active employees with related department details
             * @returns {*[]|Object[]}
             */
            activeEmployeeSearch() {
                var employeeSearchObj = search.create({
                    type: "employee",
                    filters:
                        [
                            ["isinactive", "is", "F"]
                        ],
                    columns:
                        [
                            search.createColumn({name: "internalid", label: "InternalID"}),
                            search.createColumn({
                                name: "entityid",
                                sort: search.Sort.ASC,
                                label: "Name"
                            }),
                            search.createColumn({name: "departmentnohierarchy", label: "Department"})
                        ]
                });
                var searchResultCount = employeeSearchObj.runPaged().count;
                log.debug("employeeSearchObj result count", searchResultCount);
                return dataSets.iterateSavedSearch(employeeSearchObj, dataSets.fetchSavedSearchColumn(employeeSearchObj, 'label'));
            }
        };
        applyTryCatch(dataSets, "dataSets");

        const exports = {

            /**
             * Defines the function definition that is executed before record is loaded.
             * @param {Object} scriptContext
             * @param {Record} scriptContext.newRecord - New record
             * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
             * @param {Form} scriptContext.form - Current form
             * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
             * @since 2015.2
             */
            beforeLoad(scriptContext) {
                if (scriptContext.type == 'create' || scriptContext.type == 'edit' || scriptContext.type == 'view') {
                    let proformaStatus = scriptContext.newRecord.getValue({
                        fieldId: "custrecord_jj_status_wr_218"
                    })
                    if (proformaStatus && checkForParameter((proformaStatus) && (proformaStatus == 4) || proformaStatus == 5)) {
                        let form = scriptContext.form;
                        form.clientScriptFileId = 204409;
                        let button = form.addButton({
                            id: 'custpage_vendor_bill_button',
                            functionName: 'vendorBillButton',
                            label: 'Bill'
                        });
                    }
                    if (scriptContext.type == 'create' || scriptContext.type == 'edit') {
                        let form = scriptContext.form;
                        let employeeField = form.addField({
                            id: 'custpage_wr_237_po_creator',
                            type: serverWidget.FieldType.SELECT,
                            label: 'PO Creator'
                        });
                        employeeField.setHelpText({
                            help: "The field stores the employee who will be the purchase order creator."
                        });
                        employeeField.isMandatory = true;
                        let activeEmployees = dataSets.activeEmployeeSearch();
                        employeeField.addSelectOption({       //add select options to the field
                            value: '',
                            text: ''
                        });
                        for (let k = 0; k < activeEmployees.length; k++) {
                            employeeField.addSelectOption({       //add select options to the field
                                value: activeEmployees[k].InternalID.value,
                                text: activeEmployees[k].Name.value
                            });
                        }
                        let orginalEmployeeField = form.getField({
                            id: 'custrecord_jj_po_creator'
                        });
                        orginalEmployeeField.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.HIDDEN
                        });
                    }
                }

            },

            /**
             * Defines the function definition that is executed before record is submitted.
             * @param {Object} scriptContext
             * @param {Record} scriptContext.newRecord - New record
             * @param {Record} scriptContext.oldRecord - Old record
             * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
             * @since 2015.2
             */
            beforeSubmit(scriptContext) {
                let newRecordObject = scriptContext.newRecord;
                let virtualPoCreator = newRecordObject.getValue({
                    fieldId: 'custpage_wr_237_po_creator'
                });
                if (checkForParameter(virtualPoCreator)) {
                    //created custom field value is set to orginal field(hidden)
                    newRecordObject.setValue({
                        fieldId: 'custrecord_jj_po_creator',
                        value: virtualPoCreator,
                        ignoreFieldChange: true
                    });
                }
            },

            /**
             * Defines the function definition that is executed after record is submitted.
             * @param {Object} scriptContext
             * @param {Record} scriptContext.newRecord - New record
             * @param {Record} scriptContext.oldRecord - Old record
             * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
             * @since 2015.2
             */
            afterSubmit(scriptContext) {
                let form = scriptContext.form;
                let approvalStatus = scriptContext.newRecord.getValue({
                    fieldId: "custrecord_jj_status_wr_218"
                });
                if ((scriptContext.type == 'create' || scriptContext.type == 'edit') && runtime.executionContext == runtime.ContextType.USER_INTERFACE) {
                    let emailContentLines = [];
                    var totalLines = '';
                    let attachmentsArray = [];
                    let userObj = runtime.getCurrentUser();
                    let runtimeUser = userObj.id;
                    let poCreator = scriptContext.newRecord.getValue({
                        fieldId: "custrecord_jj_po_creator"
                    });
                    if (poCreator && checkForParameter(poCreator) && scriptContext.type == 'create') {
                        let newRecord = record.load({
                            type: 'customrecord_jj_proforma_bill_wr_218',
                            id: scriptContext.newRecord.id,
                            isDynamic: true
                        })
                        let emailContent = exports.emailTemplateCreation(scriptContext, newRecord, emailContentLines, totalLines);
                        let fileAttachments = dataSets.proformaAttachmentSearch(scriptContext.newRecord.id);
                        let attachmentSize;
                        for (let m = 0; m < fileAttachments.length; m++) {
                            if (fileAttachments[m].InternalID.value && checkForParameter(fileAttachments[m].InternalID.value)) {
                                let fileObjects = file.load({
                                    id: fileAttachments[m].InternalID.value
                                })
                                attachmentsArray.push(fileObjects);
                                attachmentSize += fileAttachments[m].SizeinKb.value
                            }
                        }
                        if (attachmentSize > 15000) {
                            let noteLine = `<p style="font-size:14px;color:rgb(255,0,0);text-align:left;line-height:21px;padding-bottom:5px;font-family:Oxygen,&quot;Helvetica Neue&quot;,Arial,sans-serif!important">Note: Attachments cannot be send due to larger size</p>`
                            emailContent = emailContent.replace("-enter2-", noteLine);
                            email.send({
                                author: runtimeUser,
                                recipients: poCreator,
                                subject: 'Vendor Bill Approval Reminder',
                                body: emailContent,
                                customRecord: {
                                    id: scriptContext.newRecord.id,
                                    recordType: 851
                                }
                            });
                        } else {
                            let noteLine = `<p style="font-size:14px;color:rgb(255,0,0);text-align:left;line-height:21px;padding-bottom:5px;font-family:Oxygen,&quot;Helvetica Neue&quot;,Arial,sans-serif!important"></p>`
                            emailContent = emailContent.replace("-enter2-", noteLine);
                            email.send({
                                author: runtimeUser,
                                recipients: poCreator,
                                subject: 'Vendor Bill Approval Reminder',
                                body: emailContent,
                                attachments: attachmentsArray,
                                customRecord: {
                                    id: scriptContext.newRecord.id,
                                    recordType: 851
                                }
                            });
                        }
                        newRecord.setValue({
                            fieldId: 'custrecord_jj_status_wr_218',
                            value: 2
                        });

                        newRecord.save({enableSourcing: false, ignoreMandatoryFields: true});

                    } else if (poCreator && checkForParameter(poCreator) && scriptContext.type == 'edit') {
                        let oldPocreator = scriptContext.oldRecord.getValue({
                            fieldId: "custrecord_jj_po_creator"
                        })
                        if (oldPocreator !== poCreator) {
                            let newRecord = record.load({
                                type: 'customrecord_jj_proforma_bill_wr_218',
                                id: scriptContext.newRecord.id,
                                isDynamic: true
                            });
                            let emailContent = exports.emailTemplateCreation(scriptContext, newRecord, emailContentLines, totalLines);
                            let fileAttachments = dataSets.proformaAttachmentSearch(scriptContext.newRecord.id);
                            let attachmentSize;
                            for (let m = 0; m < fileAttachments.length; m++) {
                                if (fileAttachments[m].InternalID.value && checkForParameter(fileAttachments[m].InternalID.value)) {
                                    let fileObjects = file.load({
                                        id: fileAttachments[m].InternalID.value
                                    })
                                    attachmentsArray.push(fileObjects);
                                    attachmentSize += fileAttachments[m].SizeinKb.value
                                }
                            }
                            if (attachmentSize > 15000) {
                                let noteLine = `<p style="font-size:14px;color:rgb(255,0,0);text-align:left;line-height:21px;padding-bottom:5px;font-family:Oxygen,&quot;Helvetica Neue&quot;,Arial,sans-serif!important">Note: Attachments cannot be send due to larger size</p>`
                                emailContent = emailContent.replace("-enter2-", noteLine);
                                email.send({
                                    author: runtimeUser,
                                    recipients: poCreator,
                                    subject: 'Vendor Bill Approval Reminder',
                                    body: emailContent,
                                    customRecord: {
                                        id: scriptContext.newRecord.id,
                                        recordType: 851
                                    }
                                });
                            } else {
                                let noteLine = `<p style="font-size:14px;color:rgb(255,0,0);text-align:left;line-height:21px;padding-bottom:5px;font-family:Oxygen,&quot;Helvetica Neue&quot;,Arial,sans-serif!important"></p>`
                                emailContent = emailContent.replace("-enter2-", noteLine);
                                email.send({
                                    author: runtimeUser,
                                    recipients: poCreator,
                                    subject: 'Vendor Bill Approval Reminder',
                                    body: emailContent,
                                    attachments: attachmentsArray,
                                    customRecord: {
                                        id: scriptContext.newRecord.id,
                                        recordType: 851
                                    }
                                });
                            }
                            newRecord.setValue({
                                fieldId: 'custrecord_jj_status_wr_218',
                                value: 2
                            });
                            newRecord.save({enableSourcing: false, ignoreMandatoryFields: true});
                        }
                    }

                }
            },
            /**
             *
             * @description function to create the contents of the email.
             * @param scriptContext
             * @param newRecord - New record
             * @param emailContentLines
             * @param totalLines
             * @returns {string}
             */
            emailTemplateCreation(scriptContext, newRecord, emailContentLines, totalLines) {
                let special_content = '';
                let approverName = newRecord.getText({
                    fieldId: "custrecord_jj_po_creator"
                });
                let transactionNumber = newRecord.getValue({
                    fieldId: "name"
                });
                let billDate = newRecord.getText({
                    fieldId: "custrecord_jj_date_wr_218"
                });
                let supplierName = newRecord.getValue({
                    fieldId: "custrecord_jj_vendor_wr_218"
                });
                let totalAmount = newRecord.getValue({
                    fieldId: 'custrecord_jj_amount_wr_218'
                });
                let currency = newRecord.getText({
                    fieldId: 'custrecord_jj_currency_wr_218'
                });
                let expenseNumLines = newRecord.getLineCount({
                    sublistId: 'recmachcustrecord_jj_expense_proforma_wr_218'
                });
                let itemName;
                let memo;
                let quantity;
                let grossAmount;
                for (let i = 0; i < expenseNumLines; i++) {
                    let objMap = {};
                    newRecord.selectLine({
                        sublistId: 'recmachcustrecord_jj_expense_proforma_wr_218',
                        line: i
                    });
                    itemName = newRecord.getCurrentSublistText({
                        sublistId: 'recmachcustrecord_jj_expense_proforma_wr_218',
                        fieldId: 'custrecord_jj_expense_account_wr_218',
                    });
                    memo = newRecord.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_jj_expense_proforma_wr_218',
                        fieldId: 'custrecord_jj_expense_memo_wr_218',
                    });
                    quantity = '';
                    grossAmount = newRecord.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_jj_expense_proforma_wr_218',
                        fieldId: 'custrecord_jj_expense_gross_amt_wr_218',
                    });
                    objMap = {
                        transactionNumber: transactionNumber,
                        billDate: billDate,
                        supplierName: supplierName,
                        approverName: approverName,
                        currency: currency,
                        itemName: itemName,
                        memo: memo,
                        quantity: quantity,
                        grossAmount: grossAmount
                    }
                    emailContentLines.push(objMap)
                }
                let itemNumLines = newRecord.getLineCount({
                    sublistId: 'recmachcustrecord_jj_item_proforma_wr_218'
                });
                for (let k = 0; k < itemNumLines; k++) {
                    let objMap = {};
                    newRecord.selectLine({
                        sublistId: 'recmachcustrecord_jj_item_proforma_wr_218',
                        line: k
                    });
                    itemName = newRecord.getCurrentSublistText({
                        sublistId: 'recmachcustrecord_jj_item_proforma_wr_218',
                        fieldId: 'custrecord_jj_items_wr_218',
                    });
                    memo = newRecord.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_jj_item_proforma_wr_218',
                        fieldId: 'custrecord_jj_item_desc_wr_218',
                    });
                    quantity = newRecord.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_jj_item_proforma_wr_218',
                        fieldId: 'custrecord_jj_item_quantity_wr_218',
                    });
                    grossAmount = newRecord.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_jj_item_proforma_wr_218',
                        fieldId: 'custrecord_jj_gross_amt_wr_218',
                    });
                    objMap = {
                        transactionNumber: transactionNumber,
                        billDate: billDate,
                        supplierName: supplierName,
                        approverName: approverName,
                        currency: currency,
                        itemName: itemName,
                        memo: memo,
                        quantity: quantity,
                        grossAmount: grossAmount
                    }
                    emailContentLines.push(objMap)
                }
                log.debug("emailContentLines", emailContentLines);

                let fileObj = file.load({
                    id: 203590//sandbox
                });
                let fileContents = fileObj.getContents();
                let line = '<tr>' +
                    '<td style="font-size:14px;color:rgb(119,119,119);font-family:Oxygen,&quot;Helvetica Neue&quot;,Arial,sans-serif!important">' +
                    `<a href="https://4201672-sb1.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=851&id=${scriptContext.newRecord.id}&amp;compid=4201672_SB1" target="_blank" data-saferedirecturl="https://4201672-sb1.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=851&id%${scriptContext.newRecord.id}%26compid%3D4201672_SB1&amp;source=gmail&amp;ust=1601531407163000&amp;usg=AFQjCNGzFoTGPJnYju2QvR8A-Agd18lWMw">transactionNumber</a>` +
                    '</td>' +
                    '<td style="font-size:14px; align:left; color:rgb(119,119,119);font-family:Oxygen,&quot;Helvetica Neue&quot;,Arial,sans-serif!important;" align = "left">billDate</td>' +
                    '<td style="font-size:14px; align:left; color:rgb(119,119,119);font-family:Oxygen,&quot;Helvetica Neue&quot;,Arial,sans-serif!important" align = "left">supplierName</td>' +
                    '<td style="font-size:14px; align:left; color:rgb(119,119,119);font-family:Oxygen,&quot;Helvetica Neue&quot;,Arial,sans-serif!important" align = "left">approverName</td>' +
                    '<td style="font-size:14px; align:left; color:rgb(119,119,119);font-family:Oxygen,&quot;Helvetica Neue&quot;,Arial,sans-serif!important" align = "left">currency</td>' +
                    '<td style="font-size:14px; align:left; color:rgb(119,119,119);font-family:Oxygen,&quot;Helvetica Neue&quot;,Arial,sans-serif!important" align = "left">itemName</td>' +
                    '<td style="font-size:14px; align:left; color:rgb(119,119,119);font-family:Oxygen,&quot;Helvetica Neue&quot;,Arial,sans-serif!important" align = "left">memo</td>' +
                    '<td style="font-size:14px; align:left; color:rgb(119,119,119);font-family:Oxygen,&quot;Helvetica Neue&quot;,Arial,sans-serif!important" align = "left">quantity</td>' +
                    '<td style="font-size:14px; align:left; color:rgb(119,119,119);font-family:Oxygen,&quot;Helvetica Neue&quot;,Arial,sans-serif!important" align = "left">grossAmount</td>' +
                    '</tr>'


                for (let j = 0; j < emailContentLines.length; j++) {
                    let linedata = line;
                    for (let key in emailContentLines[j]) {
                        linedata = linedata.replace(key, emailContentLines[j][key])
                    }
                    totalLines = totalLines + linedata;
                }
                special_content = fileContents.replace("-enter-", totalLines);
                special_content = special_content.replace("Vendor Bill", "Proforma Vendor Bill");

                return special_content;
            }
        }
        applyTryCatch(exports, "exports");
        return exports

    });
