import Airtable from 'airtable'

require('dotenv').config()

export default class Database {
    static async findUser(email) {
        const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
        try {
            const records = await airtable
                .base(process.env.AIRTABLE_BASE_ID)
                .table(process.env.AIRTABLE_USERS_TABLE_ID)
                .select({
                    filterByFormula: `{Email} = "${email}"`,
                })
                .all()
            return records.length > 0 ? records[0] : null
        } catch (exception) {
            console.error(`issue detected ...\n${exception}`)
        }
    }

    static generateFilterForProperties(
        areas,
        beds,
        minPrice,
        price,
        properties = []
    ) {
        // The api has a limitation on working with arrays. There are no functions
        // for arrays as contain or in. Therefore, the search for the number is
        // performed by the string with the number treated with commas
        const propertiesFormula = `NOT(SEARCH(CONCATENATE(",", {Номер} ,","), ',${properties},'))`
        return `
        AND(
            ${properties.length ? propertiesFormula : 'TRUE()'},
            {Модерация},
            SEARCH({Район}, '${areas}'),
            SEARCH({Количество спален}, '${beds}'),
            {Цена долларов в месяц} >= ${minPrice},
            {Цена долларов в месяц} <= ${price},
            {Город}='Бали'
        )
        `
    }

    static async findProperties(areas, beds, minPrice, price, limit = 3) {
        const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
        try {
            return await airtable
                .base(process.env.AIRTABLE_BASE_ID)
                .table(process.env.AIRTABLE_PROPERTIES_TABLE_ID)
                .select({
                    filterByFormula: this.generateFilterForProperties(
                        areas,
                        beds,
                        minPrice,
                        price
                    ),
                    maxRecords: limit
                })
                .all()
        } catch (exception) {
            console.error(`issue detected ...\n${exception}`)
        }
    }

    static async findNewProperties(
        areas,
        beds,
        minPrice,
        price,
        properties = [],
        limit = 3
    ) {
        const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
        try {
            return await airtable
                .base(process.env.AIRTABLE_BASE_ID)
                .table(process.env.AIRTABLE_PROPERTIES_TABLE_ID)
                .select({
                    filterByFormula: this.generateFilterForProperties(
                        areas,
                        beds,
                        minPrice,
                        price,
                        properties
                    ),
                    maxRecords: limit
                })
                .all()
        } catch (exception) {
            console.error(`issue detected ...\n${exception}`)
            return []
        }
    }
}
