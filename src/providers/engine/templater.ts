import locales from '../../config/locales'
import areas from '../../config/areas'

export class Templater {
    static applyProperty(property, userLocale) {
        let template: string = locales[userLocale].finalMessage
        if (property.get('Заголовок') && userLocale === 'ru') {
            template = `${property.get('Заголовок')}\n${template}`
        } else if (property.get('Title eng') && userLocale === 'en') {
            template = `${property.get('Title eng')}\n${template}`
        }
        let templateArea: string = ''
        if (userLocale === 'ru') {
            templateArea = property.get('Район')
        } else if (userLocale === 'en') {
            templateArea = property.get('District')
        }
        template = template.replace('${areas}', templateArea)
        template = template.replace(
            '${beds}',
            property.get('Количество спален')
        )
        template = template.replace(
            '${price}',
            property.get('Цена долларов в месяц')
        )
        let link = locales[userLocale].catalog_url.replace('${id}', property.get('ad_id'))
        template = template.replace(
            '${link}',
            `<a href="${link}">${locales[userLocale].link}</a>`
        )
        return template
    }

    static applyDetails(request, userLocale) {
        let requestAreas: any = []
        if (userLocale === 'en') {
            request.areas.forEach((area) => {
                requestAreas.push(areas[userLocale][areas['ru'].indexOf(area)])
            })
        } else {
            requestAreas = request.areas
        }

        const price =
            request.minPrice != null
                ? `${request.minPrice}-${request.price}`
                : request.price

        let template: string = locales[userLocale].details
        template = template.replace('${areas}', requestAreas.join(','))
        template = template.replace('${beds}', request.beds.join(','))
        template = template.replace('${price}', price)
        return template
    }
}
