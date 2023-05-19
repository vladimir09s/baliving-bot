import Airtable from "airtable";
require('dotenv').config();

export default class Database {
    static async findUser(email) {
        const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
        try {
            const records = await airtable
                .base(process.env.AIRTABLE_BASE_ID)
                .table(process.env.AIRTABLE_USERS_TABLE_ID)
                .select({
                    filterByFormula: `{Email} = "${email}"`
                })
                .all();
            return (records.length > 0) ? records[0] : null;
        } catch (exception) {
            console.error(`issue detected ...\n${exception}`);
        }
    }

    static async findProperties(areas, beds, minPrice, price) {
        const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
        try {
            const records = await airtable
                .base(process.env.AIRTABLE_BASE_ID)
                .table(process.env.AIRTABLE_PROPERTIES_TABLE_ID)
                .select()
                .all();
            return records.filter((record) => {
                let filtered = record.get('Модерация') &&
                    areas.includes(record.get('Район')) &&
                    beds.includes(record.get('Количество спален')) &&
                    price >= record.get('Цена долларов в месяц');
                if (minPrice != null) {
                  filtered = filtered &&
                    minPrice <= record.get('Цена долларов в месяц');
                }
                return filtered;
            });
        } catch (exception) {
            console.error(`issue detected ...\n${exception}`);
        }
    }

    static async findNewProperties(areas, beds, minPrice, price, properties = []) {
        const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
        try {
            const records = await airtable
                .base(process.env.AIRTABLE_BASE_ID)
                .table(process.env.AIRTABLE_PROPERTIES_TABLE_ID)
                .select()
                .all();
            return records.filter((record) => {
                let filtered = !properties.includes(`${record.get('Номер')}`) &&
                    record.get('Модерация') &&
                    areas.includes(record.get('Район')) &&
                    beds.includes(record.get('Количество спален')) &&
                    price >= record.get('Цена долларов в месяц')
                if (minPrice != null) {
                  filtered = filtered &&
                    minPrice <= record.get('Цена долларов в месяц');
                }
                return filtered;
            });
        } catch (exception) {
            console.error(`issue detected ...\n${exception}`);
            return [];
        }
    }
}
