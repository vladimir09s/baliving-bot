import { UsersService } from '../../users/users.service'
import { RequestsService } from '../../requests/requests.service'
import { FetchService } from 'nestjs-fetch'
import locales from '../../config/locales'
import { Templater } from './templater'

export enum Actions {
    WaitingForReply = 'waiting-for-reply',
    Confirm = 'confirm',
    DisplayResults = 'display-results',

    AskEmail = 'ask-email',
    ReadEmail = 'read-email',

    ReadLocale = 'read-locale',
    ReadAreas = 'read-areas',
    ReadBeds = 'read-beds',
    ReadMinPrice = 'read-min-price',
    ReadPrice = 'read-price',

    ReadEditLocale = 'read-edit-locale',
    ReadEditAreas = 'read-edit-areas',
    ReadEditBeds = 'read-edit-beds',
    ReadEditMinPrice = 'read-edit-min-price',
    ReadEditPrice = 'read-edit-price',
}

export class BaseHandler {
    constructor(
        protected readonly usersService: UsersService,
        protected readonly requestsService: RequestsService,
        protected readonly bot,
        protected readonly fetch: FetchService
    ) {}

    sliceIntoChunks(array, size) {
        const result = []
        for (let i = 0; i < array.length; i += size) {
            const chunk = array.slice(i, i + size)
            result.push(chunk)
        }
        return result
    }

    async sendStartSearchingPreview(user, request) {
        await this.bot.sendMessage(user.chatId, locales[user.locale].finish, {
            parse_mode: 'html',
        })
        const options: any = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: locales[user.locale].agree,
                            callback_data: 'start-search',
                        },
                    ],
                ],
            },
        }
        const template = Templater.applyDetails(request, user.locale)
        await this.bot.sendMessage(user.chatId, template, options)
    }
}
