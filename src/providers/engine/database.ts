import Airtable from "airtable";
require('dotenv').config();

export default class Database {
    static async findUser(email) {
        const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
        try {
            const records = await airtable
                .base(process.env.AIRTABLE_BASE_ID)
                .table(process.env.AIRTABLE_USERS_TABLE_ID)
                .select()
                .all();
            return records.find(record => record.get("Email") === email);
        } catch (exception) {
            console.error(exception);
        }
    }
}