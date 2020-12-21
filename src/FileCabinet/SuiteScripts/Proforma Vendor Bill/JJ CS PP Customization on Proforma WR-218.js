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
            if(sublistName == "recmachcustrecord_jj_item_proforma_wr_218" && (fieldName == "custrecord_jj_item_quantity_wr_218" || fieldName == "custrecord_jj_item_rate_wr_218")) {
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
                console.log("Error @ validateLine", err);
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
            if(numLinesItem == 0 && numLinesExpense == 0) {
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

        return {
            fieldChanged: fieldChanged,
            sublistChanged: sublistChanged,
            saveRecord: saveRecord,
            vendorBillButton: vendorBillButton
        };

    });
