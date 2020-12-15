/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/https', 'N/record', 'N/search', 'N/url', 'N/redirect'],
    /**
     * @param{https} https
     * @param{record} record
     * @param{search} search
     * @param{url} url
     * @param{redirect} redirect
     */
    (https, record, search, url, redirect) => {
        /**
         * Defines the WorkflowAction script trigger point.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
         * @param {string} scriptContext.type - Event type
         * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
         * @since 2016.1
         */
        const onAction = (scriptContext) => {
            try {
                let form = scriptContext.form
                log.debug("form", form);
                let recId = scriptContext.newRecord.id;
                log.debug("recId", recId);

                redirect.toSuitelet({
                    scriptId: 'customscript_jj_sl_reject_reason_pop_up',
                    deploymentId: 'customdeploy_jj_sl_reject_reason_pop_up',
                    parameters: {'recId': recId}
                });
            } catch (err) {
                log.debug("Error @ onAction", err);
            }
        }

        return {onAction};
    });
