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
             * @param {Record} scriptContext.newRecord - New record
             * @param {Record} scriptContext.oldRecord - Old record
             * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
             * @since 2015.2
             */
            afterSubmit(scriptContext) {
                log.debug("scriptContext.type", scriptContext.type);
                if (scriptContext.type == 'create' || scriptContext.type == 'edit' || scriptContext.type == 'delete') {
                    let newRecord = scriptContext.newRecord;
                    let oldRecord = scriptContext.oldRecord;
                    let newProformaVendorBill = newRecord.getValue({
                        fieldId: 'custbody_jj_proforma_bill_po_wr_218'
                    });

                    if (scriptContext.type == 'create' && checkForParameter(newProformaVendorBill)) {
                        if (newRecord.type == "purchaseorder") {
                            record.submitFields({
                                type: 'customrecord_jj_proforma_bill_wr_218',
                                id: newProformaVendorBill,
                                values: {
                                    'custrecord_jj_status_wr_218': 3,
                                    'custrecord_jj_purchase_order_wr_218': scriptContext.newRecord.id
                                }
                            });
                        } else if (newRecord.type == "vendorbill") {
                            let objectRecord = record.load({
                                type: record.Type.VENDOR_BILL,
                                id: scriptContext.newRecord.id,
                                isDynamic: true,
                            })
                            let purchaseOrders = objectRecord.getLineCount({
                                sublistId: "purchaseorders"
                            });
                            if (newProformaVendorBill && checkForParameter(newProformaVendorBill)) {
                                let fieldLookup = search.lookupFields({
                                    type: 'customrecord_jj_proforma_bill_wr_218',
                                    id: newProformaVendorBill,
                                    columns: ['custrecord_jj_vendor_bill_wr_218']
                                });
                                let vendorBills = []
                                for (let k = 0; k < fieldLookup.custrecord_jj_vendor_bill_wr_218.length; k++) {
                                    vendorBills.push(fieldLookup.custrecord_jj_vendor_bill_wr_218[k].value)
                                }
                                vendorBills.push(scriptContext.newRecord.id);
                                for (let m = 0; m < purchaseOrders; m++) {
                                    objectRecord.selectLine({
                                        sublistId: 'purchaseorders',
                                        line: m
                                    });
                                    let purchaseOrderId = objectRecord.getCurrentSublistValue({
                                        sublistId: "purchaseorders",
                                        fieldId: "id",
                                    });
                                    let fieldlookup = search.lookupFields({
                                        type: 'purchaseorder',
                                        id: purchaseOrderId,
                                        columns: ['status']
                                    });
                                    let purchaseOrderStatus = fieldlookup.status[0].value;
                                    if (purchaseOrderStatus == "fullyBilled") {
                                        record.submitFields({
                                            type: "customrecord_jj_proforma_bill_wr_218",
                                            id: newProformaVendorBill,
                                            values: {
                                                'custrecord_jj_status_wr_218': 6,
                                                'custrecord_jj_vendor_bill_wr_218': vendorBills
                                            }
                                        });
                                    } else {
                                        record.submitFields({
                                            type: "customrecord_jj_proforma_bill_wr_218",
                                            id: newProformaVendorBill,
                                            values: {
                                                'custrecord_jj_status_wr_218': 5,
                                                'custrecord_jj_vendor_bill_wr_218': vendorBills
                                            }
                                        });
                                    }
                                }
                            }
                        } else {
                            let fieldLookup = search.lookupFields({
                                type: 'customrecord_jj_proforma_bill_wr_218',
                                id: newProformaVendorBill,
                                columns: ['custrecord_jj_item_reciept_wr_218', "custrecord_jj_vendor_bill_wr_218"]
                            });
                            let itemReciepts = []
                            for (let k = 0; k < fieldLookup.custrecord_jj_item_reciept_wr_218.length; k++) {
                                itemReciepts.push(fieldLookup.custrecord_jj_item_reciept_wr_218[k].value)
                            }
                            itemReciepts.push(scriptContext.newRecord.id);
                            let vendorBills = []
                            for (let r = 0; r < fieldLookup.custrecord_jj_vendor_bill_wr_218.length; r++) {
                                vendorBills.push(fieldLookup.custrecord_jj_vendor_bill_wr_218[r].value)
                            }
                            let recordSubmitValues = {};
                            if (vendorBills.length == 0) {
                                recordSubmitValues = {
                                    'custrecord_jj_status_wr_218': 4,
                                    'custrecord_jj_item_reciept_wr_218': itemReciepts
                                }
                            } else {
                                recordSubmitValues = {
                                    'custrecord_jj_item_reciept_wr_218': itemReciepts
                                }
                            }
                            record.submitFields({
                                type: 'customrecord_jj_proforma_bill_wr_218',
                                id: newProformaVendorBill,
                                values: recordSubmitValues
                            });
                        }
                    } else if (scriptContext.type == 'edit') {
                        let oldProformaVendorBill = oldRecord.getValue({
                            fieldId: 'custbody_jj_proforma_bill_po_wr_218'
                        });
                        log.debug("oldProformaVendorBill", oldProformaVendorBill)
                        if (checkForParameter(newProformaVendorBill) && newProformaVendorBill != oldProformaVendorBill) {
                            if (newRecord.type == "purchaseorder") {
                                record.submitFields({
                                    type: 'customrecord_jj_proforma_bill_wr_218',
                                    id: newProformaVendorBill,
                                    values: {
                                        'custrecord_jj_status_wr_218': 3,
                                        'custrecord_jj_purchase_order_wr_218': scriptContext.newRecord.id
                                    }
                                });
                            } else if (newRecord.type == "vendorbill") {
                                let objectRecord = record.load({
                                    type: record.Type.VENDOR_BILL,
                                    id: scriptContext.newRecord.id,
                                    isDynamic: true,
                                })
                                let purchaseOrders = objectRecord.getLineCount({
                                    sublistId: "purchaseorders"
                                });
                                let fieldLookup = search.lookupFields({
                                    type: 'customrecord_jj_proforma_bill_wr_218',
                                    id: newProformaVendorBill,
                                    columns: ['custrecord_jj_vendor_bill_wr_218']
                                });
                                let vendorBills = []
                                for (let k = 0; k < fieldLookup.custrecord_jj_vendor_bill_wr_218.length; k++) {
                                    vendorBills.push(fieldLookup.custrecord_jj_vendor_bill_wr_218[k].value)
                                }
                                vendorBills.push(scriptContext.newRecord.id);
                                for (let m = 0; m < purchaseOrders; m++) {
                                    objectRecord.selectLine({
                                        sublistId: 'purchaseorders',
                                        line: m
                                    });
                                    let purchaseOrderId = objectRecord.getCurrentSublistValue({
                                        sublistId: "purchaseorders",
                                        fieldId: "id",
                                    });
                                    let fieldlookup = search.lookupFields({
                                        type: 'purchaseorder',
                                        id: purchaseOrderId,
                                        columns: ['status']
                                    });
                                    let purchaseOrderStatus = fieldlookup.status[0].value;
                                    if (purchaseOrderStatus == "fullyBilled") {
                                        record.submitFields({
                                            type: "customrecord_jj_proforma_bill_wr_218",
                                            id: newProformaVendorBill,
                                            values: {
                                                'custrecord_jj_status_wr_218': 6,
                                                'custrecord_jj_vendor_bill_wr_218': vendorBills
                                            }
                                        });
                                    } else {
                                        record.submitFields({
                                            type: "customrecord_jj_proforma_bill_wr_218",
                                            id: newProformaVendorBill,
                                            values: {
                                                'custrecord_jj_status_wr_218': 5,
                                                'custrecord_jj_vendor_bill_wr_218': vendorBills
                                            }
                                        });
                                    }
                                }
                            } else {
                                let fieldLookup = search.lookupFields({
                                    type: 'customrecord_jj_proforma_bill_wr_218',
                                    id: newProformaVendorBill,
                                    columns: ['custrecord_jj_item_reciept_wr_218', 'custrecord_jj_vendor_bill_wr_218']
                                });
                                let itemReciepts = []
                                for (let k = 0; k < fieldLookup.custrecord_jj_item_reciept_wr_218.length; k++) {
                                    itemReciepts.push(fieldLookup.custrecord_jj_item_reciept_wr_218[k].value)
                                }
                                itemReciepts.push(scriptContext.newRecord.id);
                                let vendorBills = []
                                for (let r = 0; r < fieldLookup.custrecord_jj_vendor_bill_wr_218.length; r++) {
                                    vendorBills.push(fieldLookup.custrecord_jj_vendor_bill_wr_218[r].value)
                                }
                                let recordSubmitValues = {};
                                if (vendorBills.length == 0) {
                                    recordSubmitValues = {
                                        'custrecord_jj_status_wr_218': 4,
                                        'custrecord_jj_item_reciept_wr_218': itemReciepts
                                    }
                                } else {
                                    recordSubmitValues = {
                                        'custrecord_jj_item_reciept_wr_218': itemReciepts
                                    }
                                }
                                record.submitFields({
                                    type: 'customrecord_jj_proforma_bill_wr_218',
                                    id: newProformaVendorBill,
                                    values: recordSubmitValues
                                });
                            }
                        }
                    } else if (scriptContext.type == 'delete') {
                        let oldProformaVendorBill = oldRecord.getValue({
                            fieldId: 'custbody_jj_proforma_bill_po_wr_218'
                        });
                        if (checkForParameter(oldProformaVendorBill)) {
                            if (oldRecord.type == "purchaseorder") {
                                record.submitFields({
                                    type: 'customrecord_jj_proforma_bill_wr_218',
                                    id: oldProformaVendorBill,
                                    values: {
                                        'custrecord_jj_status_wr_218': 2
                                    }
                                });
                            } else if (oldRecord.type == "vendorbill") {
                                if (checkForParameter(oldProformaVendorBill)) {
                                    let fieldLookup = search.lookupFields({
                                        type: 'customrecord_jj_proforma_bill_wr_218',
                                        id: oldProformaVendorBill,
                                        columns: ['custrecord_jj_vendor_bill_wr_218']
                                    });
                                    if (fieldLookup.custrecord_jj_vendor_bill_wr_218.length == 0) {
                                        record.submitFields({
                                            type: 'customrecord_jj_proforma_bill_wr_218',
                                            id: oldProformaVendorBill,
                                            values: {
                                                'custrecord_jj_status_wr_218': 4
                                            }
                                        });
                                    } else {
                                        record.submitFields({
                                            type: 'customrecord_jj_proforma_bill_wr_218',
                                            id: oldProformaVendorBill,
                                            values: {
                                                'custrecord_jj_status_wr_218': 5
                                            }
                                        });
                                    }
                                }
                            } else {
                                let fieldLookup = search.lookupFields({
                                    type: 'customrecord_jj_proforma_bill_wr_218',
                                    id: oldProformaVendorBill,
                                    columns: ['custrecord_jj_item_reciept_wr_218']
                                });
                                if (fieldLookup.custrecord_jj_item_reciept_wr_218.length == 0) {
                                    record.submitFields({
                                        type: 'customrecord_jj_proforma_bill_wr_218',
                                        id: oldProformaVendorBill,
                                        values: {
                                            'custrecord_jj_status_wr_218': 3
                                        }
                                    });
                                }
                            }
                        }
                    } else {

                    }
                }
            },
        }

        applyTryCatch(exports, "exports");
        return exports

    });
