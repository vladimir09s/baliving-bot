import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {UsersService} from "../users/users.service";
import {RequestsService} from "../requests/requests.service";
import Database from "./engine/database";
import locales from "../config/locales";
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const DEFAULT_LOCALE = 'ru';

const CATALOG_URL = 'https://baliving.ru/arenda-zhilya-na-bali-na-dlitelnyy-srok?filters499852640=%D0%A0%D0%B0%D0%B9%D0%BE%D0%BD__eq__${areas}__and__%D0%9A%D0%BE%D0%BB%D0%B8%D1%87%D0%B5%D1%81%D1%82%D0%B2%D0%BE+%D1%81%D0%BF%D0%B0%D0%BB%D0%B5%D0%BD__eq__${beds}#!/tproduct/499852640-${id}';


@Injectable()
export class TasksService {
    private readonly logger = new Logger(TasksService.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly requestsService: RequestsService,
    ) {}

    @Cron('0 */30 * * * *')
    handleCron() {
        this.logger.debug('Checking new properties');
        const bot = new TelegramBot(process.env.TOKEN);
        this.usersService.find().then(users => {
            users.forEach(user => {
                if (user.requestId) {
                    this.requestsService.find(+user.requestId).then(request => {
                        if (request.areas && request.beds && request.price) {
                            const updatedAt: Date = request.updatedAt;
                            console.debug(updatedAt);
                            Database.findNewProperties(request.areas, request.beds, request.price, updatedAt).then(properties => {
                                let isSent: boolean = false;
                                console.debug(properties);
                                for (const property of properties) {
                                    if (this.isValidUrl(property.get('Телеграм ссылка'))) {
                                        this.sendProperty(property, user, bot);
                                        isSent = true;
                                    }
                                }
                                if (isSent) {
                                    this.requestsService.update(request.id, {updatedAt: new Date()}).then(() => {
                                        bot.sendMessage(
                                            user.chatId,
                                            locales[DEFAULT_LOCALE].foundOptions,
                                        );
                                    })
                                }
                            })
                        }
                    })
                }
            })
        })
    }

    sendProperty(property, user, bot) {
        try {
            const options: any = {
                reply_markup: {
                    inline_keyboard: [[{
                        text: locales[DEFAULT_LOCALE].write,
                        switch_inline_query: locales[DEFAULT_LOCALE].write,
                        url: property.get('Телеграм ссылка')
                    }]]
                },
                parse_mode: 'html'
            }
            let template: string = locales[DEFAULT_LOCALE].finalMessage;
            if (property.get('Заголовок')) {
                template = `${property.get('Заголовок')}\n${template}`;
            }
            template = template.replace('${areas}', property.get('Район'));
            template = template.replace('${beds}', property.get('Количество спален'));
            template = template.replace('${price}', property.get('Цена долларов в месяц'));
            let link = CATALOG_URL;
            link = link.replace('${areas}', property.get('Район'));
            link = link.replace('${beds}', property.get('Количество спален'));
            link = link.replace('${id}', property.get('ad_id'));
            template = template.replace('${link}', `<a href="${link}">${locales[DEFAULT_LOCALE].link}</a>`);
            bot.sendMessage(
                user.chatId,
                template,
                options
            );
        } catch (exception) {
            console.error(exception);
        }
    }

    isValidUrl(string) {
        let url;
        try {
            url = new URL(string);
        } catch (_) {
            return false;
        }
        return url.protocol === "http:" || url.protocol === "https:";
    }
}