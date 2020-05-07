const airtable = require('https://github.com/PipedreamHQ/pipedream/components/airtable/airtable.app.js')
const moment = require('moment')
const axios = require('axios')

module.exports = {
  name: "new-records",
  version: "0.0.1",
  props: {
    db: "$.service.db",
    airtable,
    baseId: { type: "$.airtable.baseId", appProp: "airtable" },
    tableId: { type: "$.airtable.tableId", baseIdProp: "baseId" },
    viewId: { type: "$.airtable.viewId", tableIdProp: "tableId" },
    timer: {
      type: "$.interface.timer",
      default: {
        intervalSeconds: 60 * 5,
      },
    },
  },
  async run(event) {
    const config = {
      url: `https://api.airtable.com/v0/${encodeURIComponent(this.baseId)}/${encodeURIComponent(this.tableId)}`,
      params: {
        view: this.viewId,
      },
      headers: {
        Authorization: `Bearer ${this.airtable.$auth.api_key}`,
      },
    }

    const timestamp = new Date().toISOString()
    const lastTimestamp = this.db.get("lastTimestamp")
    if (lastTimestamp) {
      config.params.filterByFormula = `LAST_MODIFIED_TIME() > "${lastTimestamp}"`
    }

    const { data } = await axios(config)

    if (!data.records.length) {
      console.log(`No new or modified records.`)
      return
    }

    let newRecords = 0, modifiedRecords = 0
    for (let record of data.records) {
      if(moment(record.createdTime) > moment(lastTimestamp)) {
        record.type = "new_record"
        newRecords++
      } else {
        record.type = "record_modified"
        modifiedRecords++
      }
      this.$emit(record, {
        summary: `${record.type}: ${JSON.stringify(record.fields)}`,
        id: record.id,
      })
    }
    console.log(`Emitted ${newRecords} new records(s) and ${modifiedRecords} modified records.`)
    this.db.set("lastTimestamp", timestamp)
  },
}