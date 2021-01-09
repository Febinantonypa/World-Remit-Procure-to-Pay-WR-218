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
             * @param departmentValue of the Vendor Bill
             * @returns {*[]|Object[]}
             */
            activeEmployeeForDepartment(departmentValue) {
                var employeeSearchObj = search.create({
                    type: "employee",
                    filters:
                        [
                            ["department", "anyof", departmentValue],
                            "AND",
                            ["access", "is", "T"],
                            "AND",
                            ["isinactive", "is", "F"]
                        ],
                    columns:
                        [
                            search.createColumn({name: "internalid", label: "InternalID"}),
                            search.createColumn({
                                name: "entityid",
                                sort: search.Sort.ASC,
                                label: "Name"
                            })
                        ]
                });
                var searchResultCount = employeeSearchObj.runPaged().count;
                log.debug("employeeSearchObj result count", searchResultCount);
                return dataSets.iterateSavedSearch(employeeSearchObj, dataSets.fetchSavedSearchColumn(employeeSearchObj, 'label'));
            },
            /**
             *
             * @param vendorBillId Internal Id of the Vendor Bill
             * @returns {*[]|Object[]} returns the vender bill file attachment details
             */
            vendorBillAttachmentSearch(vendorBillId) {
                var vendorbillSearchObj = search.create({
                    type: "vendorbill",
                    filters:
                        [
                            ["type", "anyof", "VendBill"],
                            "AND",
                            ["internalid", "anyof", vendorBillId],
                            "AND",
                            ["mainline", "is", "T"]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "internalid",
                                join: "file",
                                label: "InternalID"
                            }),
                            search.createColumn({
                                name: "name",
                                join: "file",
                                label: "Name"
                            }),
                            search.createColumn({
                                name: "folder",
                                join: "file",
                                label: "Folder"
                            }),
                            search.createColumn({
                                name: "documentsize",
                                join: "file",
                                label: "SizeinKb"
                            })
                        ]
                });
                var searchResultCount = vendorbillSearchObj.runPaged().count;
                log.debug("vendorbillSearchObj result count", searchResultCount);
                return dataSets.iterateSavedSearch(vendorbillSearchObj, dataSets.fetchSavedSearchColumn(vendorbillSearchObj, 'label'));
            },

            /**
             * saved search sued for finding the employees from employee group
             * @returns {*[]|Object[]}
             */
            employeeGroupSearch() {
                var entitygroupSearchObj = search.create({
                    type: "entitygroup",
                    filters:
                        [
                            ["internalid", "anyof", "33932"]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "internalid",
                                join: "groupMember",
                                label: "InternalID"
                            }),
                            search.createColumn({
                                name: "entityid",
                                join: "groupMember",
                                label: "ID"
                            })
                        ]
                });
                let searchResultCount = entitygroupSearchObj.runPaged().count;
                log.debug("entitygroupSearchObj result count", searchResultCount);
                return dataSets.iterateSavedSearch(entitygroupSearchObj, dataSets.fetchSavedSearchColumn(entitygroupSearchObj, 'label'));
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
                let newRecord = scriptContext.newRecord;
                let form = scriptContext.form;
                form.clientScriptFileId = 203186;
                if (scriptContext.type == 'create' || scriptContext.type == 'edit' || scriptContext.type == 'view') {
                    let submitReason = newRecord.getValue({
                        fieldId: "custbody_jj_reject_reason_wr_218"
                    })
                    // if (submitReason && checkForParameter(submitReason)) {
                    //     let button = form.addButton({
                    //         id: 'custpage_resubmit_button',
                    //         functionName: 'resubmitButton',
                    //         label: 'Resubmit For Approvals'
                    //     });
                    // }
                    //ADDING PROGRESS BAR FOR Loading
                    let progressBarField = form.addField({
                        id: 'custpage_progress_bar',
                        type: 'INLINEHTML',
                        label: 'Progress bar'
                    });

                    let loadingUrl = "https://4201672-sb1.app.netsuite.com/core/media/media.nl?id=203589&c=4201672_SB1&h=RbZvTJKLaAJ0Mt5hlTdYMDVpLqxMIg3Ba2dq2e5UI4TEAv8t";

                    let htmlCode = "<div><img id='custpage_load_img' style='height:70px;width:100px;top: 400px;left: 800px;float: right;position: absolute; display: none'  src='" + loadingUrl + "'/></div>";
                    // var htmlCode = "<html><script>alert('sfs')</script></html>"
                    progressBarField.defaultValue = htmlCode;

                    if (scriptContext.type == 'create' || scriptContext.type == 'edit') {
                        let fcApproverEmployees = dataSets.employeeGroupSearch();
                        let employeeIdArray = [];
                        for (let j = 0; j < fcApproverEmployees.length; j++) {
                            employeeIdArray.push(fcApproverEmployees[j].InternalID.value);
                        }
                        newRecord.setValue({
                            fieldId: "custbody_wr_237_fc_bill_approver_jj",
                            value: employeeIdArray
                        })
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

            },

            /**
             * Defines the function definition that is executed after record is submitted.
             * @param {Object} scriptContext
             * @param {Record} scriptContext.newRecord - New recordS
             * @param {Record} scriptContext.oldRecord - Old record
             * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
             * @since 2015.2
             */
            afterSubmit(scriptContext) {
                let form = scriptContext.form;
                let special_content = '';
                let approvalStatus = scriptContext.newRecord.getValue({
                    fieldId: "approvalstatus"
                });
                log.debug("executionContext", runtime.executionContext);
                log.debug("type", scriptContext.type);
                if ((scriptContext.type == 'create' && runtime.executionContext == runtime.ContextType.USER_INTERFACE && approvalStatus == 1) || (scriptContext.type == 'edit' && runtime.executionContext == runtime.ContextType.USEREVENT && approvalStatus == 1)) {
                    let newRecord = record.load({
                        type: record.Type.VENDOR_BILL,
                        id: scriptContext.newRecord.id,
                        isDynamic: true
                    });
                    let emailContentLines = [];
                    var totalLines = '';
                    let attachmentsArray = [];
                    let fcApproved = newRecord.getValue({
                        fieldId: "custbody_wr_237_fc_approved"
                    });
                    let recipientId;
                    if (fcApproved == true) {
                        log.debug("fcApproved true", fcApproved);
                         recipientId = newRecord.getValue({
                            fieldId: "custbody_jj_approver_list_wr_218"
                        });
                    } else {
                        log.debug("fcApproved false", fcApproved);
                         recipientId = newRecord.getValue({
                            fieldId: "custbody_wr_237_fc_bill_approver_jj"
                        });
                    }
                    let userObj = runtime.getCurrentUser();
                    let runtimeUser = userObj.id;
                    let transactionNumber = newRecord.getValue({
                        fieldId: "transactionnumber"
                    });
                    let billDate = newRecord.getText({
                        fieldId: "createddate"
                    });
                    if (billDate && checkForParameter(billDate))
                        billDate = billDate.split(' ')[0];
                    let supplierName = newRecord.getValue({
                        fieldId: "entityname"
                    });
                    let totalAmount = newRecord.getValue({
                        fieldId: 'total'
                    });
                    let approverName = newRecord.getText({
                        fieldId: 'custbody_jj_approver_list_wr_218'
                    });
                    let currency = newRecord.getText({
                        fieldId: 'currency'
                    });
                    let expenseNumLines = newRecord.getLineCount({
                        sublistId: 'expense'
                    });
                    let itemName;
                    let memo;
                    let quantity;
                    let grossAmount;
                    for (let i = 0; i < expenseNumLines; i++) {
                        let objMap = {};
                        newRecord.selectLine({
                            sublistId: 'expense',
                            line: i
                        });
                        itemName = newRecord.getCurrentSublistText({
                            sublistId: 'expense',
                            fieldId: 'category',
                        });
                        memo = newRecord.getCurrentSublistValue({
                            sublistId: 'expense',
                            fieldId: 'memo',
                        });
                        quantity = '';
                        grossAmount = newRecord.getCurrentSublistValue({
                            sublistId: 'expense',
                            fieldId: 'grossamt',
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
                        sublistId: 'item'
                    });
                    for (let k = 0; k < itemNumLines; k++) {
                        let objMap = {};
                        newRecord.selectLine({
                            sublistId: 'item',
                            line: k
                        });
                        itemName = newRecord.getCurrentSublistText({
                            sublistId: 'item',
                            fieldId: 'item',
                        });
                        memo = newRecord.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'memo',
                        });
                        quantity = newRecord.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                        });
                        grossAmount = newRecord.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'grossamt',
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

                    let fileObj = file.load({
                        id: 203590//sandbox
                    });
                    let fileContents = fileObj.getContents();
                    let line = '<tr>' +
                        '<td style="font-size:14px;color:rgb(119,119,119);font-family:Oxygen,&quot;Helvetica Neue&quot;,Arial,sans-serif!important">' +
                        `<a href="https://4201672-sb1.app.netsuite.com/app/accounting/transactions/vendbill.nl?id=${scriptContext.newRecord.id}&amp;compid=4201672_SB1" target="_blank" data-saferedirecturl="https://4201672-sb1.app.netsuite.com/app/accounting/transactions/vendbill.nl?id%${scriptContext.newRecord.id}%26compid%3D4201672_SB1&amp;source=gmail&amp;ust=1601531407163000&amp;usg=AFQjCNGzFoTGPJnYju2QvR8A-Agd18lWMw">transactionNumber</a>` +
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


                    // special_content = fileContents.replace("-enter4-", recordUrl);

                    for (let j = 0; j < emailContentLines.length; j++) {
                        let linedata = line;
                        for (let key in emailContentLines[j]) {
                            linedata = linedata.replace(key, emailContentLines[j][key])
                        }
                        totalLines = totalLines + linedata;
                    }
                    special_content = fileContents.replace("-enter-", totalLines);

                    let fileAttachments = dataSets.vendorBillAttachmentSearch(scriptContext.newRecord.id);
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
                        special_content = special_content.replace("-enter2-", noteLine);
                        if (recipientId && checkForParameter(recipientId)) {
                            email.send({
                                author: runtimeUser,
                                recipients: recipientId,
                                subject: 'Vendor Bill Approval Reminder',
                                body: special_content,
                                relatedRecords: {
                                    transactionId: scriptContext.newRecord.id
                                }
                            });
                        }
                    } else {
                        let noteLine = `<p style="font-size:14px;color:rgb(255,0,0);text-align:left;line-height:21px;padding-bottom:5px;font-family:Oxygen,&quot;Helvetica Neue&quot;,Arial,sans-serif!important"></p>`
                        special_content = special_content.replace("-enter2-", noteLine);
                        if (recipientId && checkForParameter(recipientId)) {
                            email.send({
                                author: runtimeUser,
                                recipients: recipientId,
                                subject: 'Vendor Bill Approval Reminder',
                                body: special_content,
                                attachments: attachmentsArray,
                                relatedRecords: {
                                    transactionId: scriptContext.newRecord.id
                                }
                            });
                        }
                    }
                }
            },
        }

        applyTryCatch(exports, "exports");
        return exports

    });
