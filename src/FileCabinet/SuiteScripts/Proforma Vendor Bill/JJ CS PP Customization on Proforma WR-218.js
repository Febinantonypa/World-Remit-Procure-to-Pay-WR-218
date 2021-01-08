/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/record', 'N/search'],
    /**
     * @param{currentRecord} currentRecord
     * @param{record} record
     * @param{search} search
     */
    function (currentRecord, record, search) {

        /**
         * @description Global variable for storing the all the active employee details
         * @type {Array}
         *
         */
        var ACTIVE_EMPLOYEES = [];


        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {
            try {
                ACTIVE_EMPLOYEES = activeEmployeeSearch();
                var currentRecord = scriptContext.currentRecord;
                var orginalPoCreatorValue = currentRecord.getValue({
                    fieldId: 'custrecord_jj_po_creator'
                });
                if (checkForParameter(orginalPoCreatorValue)) {
                    var employeeField = currentRecord.getField({
                        fieldId: 'custpage_wr_237_po_creator'
                    });
                    employeeField.removeSelectOption({
                        value: null,
                    });
                    var departmentValue = currentRecord.getValue({
                        fieldId: 'custrecord_jj_department_wr_218'
                    });
                    if (checkForParameter(departmentValue)) {
                        function filterEmployees(ACTIVE_EMPLOYEES) {
                            return ACTIVE_EMPLOYEES.Department.value == departmentValue
                        }

                        var filteredEmployees = ACTIVE_EMPLOYEES.filter(filterEmployees);
                        insertEmployeestoField(employeeField, filteredEmployees, orginalPoCreatorValue);
                    } else {
                        insertEmployeestoField(employeeField, ACTIVE_EMPLOYEES, orginalPoCreatorValue);
                    }
                }
            } catch (err) {
                console.log("ERRRO @ PAGEINIT", err);
            }
        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            try {
                var currentRecord = scriptContext.currentRecord;
                var sublistName = scriptContext.sublistId;
                var fieldName = scriptContext.fieldId;
                //field change of amount and tax amount of item lines to autopopulate the gross amount
                if (sublistName == "recmachcustrecord_jj_item_proforma_wr_218" && (fieldName == "custrecord_jj_item_amount_wr_218" || fieldName == "custrecord_jj_item_vat_amount_wr_218")) {
                    var grossAmount;
                    var amountforItem = currentRecord.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_jj_item_proforma_wr_218',
                        fieldId: 'custrecord_jj_item_amount_wr_218'
                    });
                    var taxAmountForItem = currentRecord.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_jj_item_proforma_wr_218',
                        fieldId: 'custrecord_jj_item_vat_amount_wr_218'
                    });
                    if (!checkForParameter(amountforItem)) {
                        amountforItem = 0.00
                    }
                    if (!checkForParameter(taxAmountForItem)) {
                        taxAmountForItem = 0.00
                    }
                    grossAmount = amountforItem + taxAmountForItem;
                    currentRecord.setCurrentSublistValue({
                        fieldId: "custrecord_jj_gross_amt_wr_218",
                        sublistId: "recmachcustrecord_jj_item_proforma_wr_218",
                        value: grossAmount
                    });
                }

                //field change of amount and tax amount of expense lines to autopopulate the gross amount
                if (sublistName == "recmachcustrecord_jj_expense_proforma_wr_218" && (fieldName == "custrecord_jj_expense_amount_wr_218" || fieldName == "custrecord_jj_expense_tax_amt_wr_218")) {
                    var grossAmount;
                    var amountforExpense = currentRecord.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_jj_expense_proforma_wr_218',
                        fieldId: 'custrecord_jj_expense_amount_wr_218'
                    });
                    var taxAmountForExpense = currentRecord.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_jj_expense_proforma_wr_218',
                        fieldId: 'custrecord_jj_expense_tax_amt_wr_218'
                    })
                    if (!checkForParameter(amountforExpense)) {
                        amountforExpense = 0.00
                    }
                    if (!checkForParameter(taxAmountForExpense)) {
                        taxAmountForExpense = 0.00
                    }
                    grossAmount = amountforExpense + taxAmountForExpense;
                    currentRecord.setCurrentSublistValue({
                        fieldId: "custrecord_jj_expense_gross_amt_wr_218",
                        sublistId: "recmachcustrecord_jj_expense_proforma_wr_218",
                        value: grossAmount
                    });
                }

                //field change of rate and quantity of item lines to autopopulate the amount
                if (sublistName == "recmachcustrecord_jj_item_proforma_wr_218" && (fieldName == "custrecord_jj_item_quantity_wr_218" || fieldName == "custrecord_jj_item_rate_wr_218")) {
                    var amount;
                    var quantity = currentRecord.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_jj_item_proforma_wr_218',
                        fieldId: 'custrecord_jj_item_quantity_wr_218'
                    });
                    var rate = currentRecord.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_jj_item_proforma_wr_218',
                        fieldId: 'custrecord_jj_item_rate_wr_218'
                    });
                    if (!checkForParameter(quantity)) {
                        quantity = 0
                    }
                    if (!checkForParameter(rate)) {
                        rate = 0.00
                    }
                    amount = Number(quantity) * Number(rate);
                    currentRecord.setCurrentSublistValue({
                        fieldId: "custrecord_jj_item_amount_wr_218",
                        sublistId: "recmachcustrecord_jj_item_proforma_wr_218",
                        value: amount
                    });
                }

                // field change of department field to filter the list of the virtual PO Creator Fields
                if (fieldName == "custrecord_jj_department_wr_218") {
                    var departmentValue = currentRecord.getValue({
                        fieldId: 'custrecord_jj_department_wr_218'
                    });
                    if (checkForParameter(departmentValue)) {
                        function filterEmployees(activeEmployees) {
                            return activeEmployees.Department.value == departmentValue
                        }

                        var filteredEmployees = ACTIVE_EMPLOYEES.filter(filterEmployees);
                        var employeeField = currentRecord.getField({
                            fieldId: 'custpage_wr_237_po_creator'
                        });
                        employeeField.removeSelectOption({
                            value: null,
                        });
                        employeeField.insertSelectOption({
                            value: '',
                            text: ''
                        });
                        for (var k = 0; k < filteredEmployees.length; k++) {
                            employeeField.insertSelectOption({       //add select options to the field
                                value: filteredEmployees[k].InternalID.value,
                                text: filteredEmployees[k].Name.value
                            });
                        }
                    } else {
                        var employeeField = currentRecord.getField({
                            fieldId: 'custpage_wr_237_po_creator'
                        });
                        employeeField.removeSelectOption({
                            value: null,
                        });
                        employeeField.insertSelectOption({
                            value: '',
                            text: ''
                        });
                        for (var k = 0; k < ACTIVE_EMPLOYEES.length; k++) {
                            employeeField.insertSelectOption({       //add select options to the field
                                value: ACTIVE_EMPLOYEES[k].InternalID.value,
                                text: ACTIVE_EMPLOYEES[k].Name.value
                            });
                        }
                    }
                }
            } catch (err) {
                console.log("ERROR @ FIELDCHANGED", err);
            }
        }

        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function sublistChanged(scriptContext) {
            try {
                var currentRecord = scriptContext.currentRecord;
                var sublistName = scriptContext.sublistId;
                if (sublistName == 'recmachcustrecord_jj_item_proforma_wr_218') {
                    var totalAmount = totalSumOfExpenseAndItems(currentRecord)
                    console.log("totalAmount", totalAmount);
                    currentRecord.setValue({
                        fieldId: "custrecord_jj_amount_wr_218",
                        value: totalAmount
                    });

                } else if (sublistName == 'recmachcustrecord_jj_expense_proforma_wr_218') {
                    var totalAmount = totalSumOfExpenseAndItems(currentRecord)
                    console.log("totalAmount", totalAmount);
                    currentRecord.setValue({
                        fieldId: "custrecord_jj_amount_wr_218",
                        value: totalAmount
                    });


                } else {

                }
            } catch (err) {
                console.log("Error @ sublistChanged", err);
            }
        }

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {
            //show the alert if the item and expense sublist has no lines
            var currentRecord = scriptContext.currentRecord;
            var numLinesItem = currentRecord.getLineCount({
                sublistId: 'recmachcustrecord_jj_item_proforma_wr_218'
            });
            var numLinesExpense = currentRecord.getLineCount({
                sublistId: 'recmachcustrecord_jj_expense_proforma_wr_218'
            });
            if (numLinesItem == 0 && numLinesExpense == 0) {
                alert("You must enter at least one line item/expense for this transaction.")
                return false
            }
            return true;
        }

        /**
         * @description The function definition for the Bill button in the Proforma vendor bill
         */
        function vendorBillButton() {
            try {
                var recordId = currentRecord.get().id;
                console.log("recordId", recordId);
                var recordObj = currentRecord.get();
                console.log("recordObj", recordObj);
                // var purchaseOrder =  recordObj.getValue({
                //     fieldId: 'custrecord_jj_amount_wr_218'
                // });
                var fieldlookup = search.lookupFields({
                    type: 'customrecord_jj_proforma_bill_wr_218',
                    id: recordId,
                    columns: ['custrecord_jj_purchase_order_wr_218']
                });
                if (fieldlookup.custrecord_jj_purchase_order_wr_218.length != 0) {
                    var purchaseOrder = fieldlookup.custrecord_jj_purchase_order_wr_218[0].value;
                    console.log("purchaseOrder", purchaseOrder);
                    var newURL = "https://4201672-sb1.app.netsuite.com/app/accounting/transactions/vendbill.nl?transform=purchord&whence=&id=" + purchaseOrder + "&e=T&memdoc=0";
                    window.location.href = newURL;

                }
                console.log("fieldlookup", fieldlookup);
            } catch (err) {
                console.log("Error @ vendorBillButton", err);
            }
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

        /**
         *
         * @description the function is used to calculate the total amount for the amount field
         * @param {object} currentRecord Current form record
         * @returns {number} total Amount of the expense and item lines
         *
         */
        function totalSumOfExpenseAndItems(currentRecord) {
            var totalAmount = 0.00;
            var numLinesItem = currentRecord.getLineCount({
                sublistId: 'recmachcustrecord_jj_item_proforma_wr_218'
            })
            for (var m = 0; m < numLinesItem; m++) {
                var grossAmountforItem = currentRecord.getSublistValue({
                    sublistId: 'recmachcustrecord_jj_item_proforma_wr_218',
                    fieldId: 'custrecord_jj_gross_amt_wr_218',
                    line: m
                });
                totalAmount += grossAmountforItem;
            }
            var numLinesExpense = currentRecord.getLineCount({
                sublistId: 'recmachcustrecord_jj_expense_proforma_wr_218'
            })
            console.log("numLinesExpense", numLinesExpense);
            for (var k = 0; k < numLinesExpense; k++) {
                var grossAmountforExpense = currentRecord.getSublistValue({
                    sublistId: 'recmachcustrecord_jj_expense_proforma_wr_218',
                    fieldId: 'custrecord_jj_expense_gross_amt_wr_218',
                    line: k
                });
                console.log("grossAmountforExpense", grossAmountforExpense);
                totalAmount += grossAmountforExpense;
            }
            return totalAmount;
        }

        /**
         * @description the saved search for all the active employees with related department details
         * @returns {*[]|Object[]|*}
         */
        function activeEmployeeSearch() {
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
            return iterateSavedSearch(employeeSearchObj, fetchSavedSearchColumn(employeeSearchObj, 'label'));
        }

        /**
         * @description to format Saved Search column to key-value pair where each key represents each columns in Saved Search
         * @param {SearchObj} savedSearchObj
         * @param {void|String} priorityKey
         * @returns {Object.<String,SearchObj.columns>}
         */
        function fetchSavedSearchColumn(savedSearchObj, priorityKey) {
            var columns = savedSearchObj.columns;
            var columnsData = {},
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
        }

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
        function formatSingleSavedSearchResult(searchResult, columns) {
            var responseObj = {};
            for (var column in columns)
                responseObj[column] = {
                    value: searchResult.getValue(columns[column]),
                    text: searchResult.getText(columns[column])
                };
            return responseObj;
        }

        /**
         * @description to iterate over and initiate format of each saved search result
         * @param {SearchObj} searchObj
         * @param {void|Object.<String,SearchObj.columns>} columns
         * @returns {[]|Object[]}
         */
        function iterateSavedSearch(searchObj, columns) {
            if (!checkForParameter(searchObj))
                return false;
            if (!checkForParameter(columns))
                columns = fetchSavedSearchColumn(searchObj);

            var response = [];
            var searchPageRanges;
            try {
                searchPageRanges = searchObj.runPaged({
                    pageSize: 1000
                });
            } catch (err) {
                return [];
            }
            if (searchPageRanges.pageRanges.length < 1)
                return [];

            var pageRangeLength = searchPageRanges.pageRanges.length;
            // log.debug('pageRangeLength', pageRangeLength);

            for (var pageIndex = 0; pageIndex < pageRangeLength; pageIndex++)
                searchPageRanges.fetch({
                    index: pageIndex
                }).data.forEach(function (result) {
                    response.push(formatSingleSavedSearchResult(result, columns));
                });

            return response;
        }

        /**
         *
         * @description the function used to insert the employees to the virtual PO Creator Field
         * @param employeeField - virtual PO Creator Field Object
         * @param employeeArray - The list array of employees to insert
         * @param orginalPoCreatorValue - The value of the original PO Creator Field
         */
        function insertEmployeestoField(employeeField, employeeArray, orginalPoCreatorValue) {
            employeeField.insertSelectOption({       //add select options to the field
                value: '',
                text: ''
            });
            for (var k = 0; k < employeeArray.length; k++) {
                if (employeeArray[k].InternalID.value == orginalPoCreatorValue) {
                    employeeField.insertSelectOption({       //add select options to the field
                        value: employeeArray[k].InternalID.value,
                        text: employeeArray[k].Name.value,
                        isSelected: true
                    });
                } else {
                    employeeField.insertSelectOption({       //add select options to the field
                        value: employeeArray[k].InternalID.value,
                        text: employeeArray[k].Name.value
                    });
                }
            }
        }


        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            sublistChanged: sublistChanged,
            saveRecord: saveRecord,
            vendorBillButton: vendorBillButton
        };

    });
