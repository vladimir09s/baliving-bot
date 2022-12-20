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

    static async findProperties(areas, beds, price) {
        const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
        try {
            const records = await airtable
                .base(process.env.AIRTABLE_BASE_ID)
                .table(process.env.AIRTABLE_PROPERTIES_TABLE_ID)
                .select()
                .all();
            return records.filter((record) => {
                return record.get('Модерация') &&
                    areas.includes(record.get('Район')) &&
                    beds.includes(record.get('Количество спален')) &&
                    price >= record.get('Цена долларов в месяц');
            });
        } catch (exception) {
            console.error(exception);
        }
    }
}