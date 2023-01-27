import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {UsersService} from "../users/users.service";
import {RequestsService} from "../requests/requests.service";
import Database from "./engine/database";
import locales from "../config/locales";
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const DEFAULT_LOCALE = 'ru';

const CATALOG_URL = 'https://baliving.ru/arenda-zhilya-na-bali-na-dlitelnyy-srok?filters499852640=Popup__find__${id}';

const CHOSE = '✅';

@Injectable()
export class TasksService {
    constructor(
        private readonly usersService: UsersService,
        private readonly requestsService: RequestsService,
    ) {}

    @Cron('0 */30 * * * *')
    handleCron() {
        console.debug('Checking new properties ...');
        const bot = new TelegramBot(process.env.TOKEN);
        this.usersService.find().then(users => {
            users.forEach(user => {
                if (user.requestId) {
                    Database.findUser(user.email).then((databaseUser) => {
                        if (databaseUser && databaseUser.get('Доступ действителен') === CHOSE) {
                            if (databaseUser.get('Plan') === 'VIP') {
                                this.requestsService.find(+user.requestId).then(request => {
                                    if (request.areas && request.beds && request.price) {
                                        const properties: any = request.properties ? request.properties : [];
                                        console.debug(properties);
                                        Database.findNewProperties(request.areas, request.beds, request.price, properties).then(newProperties => {
                                            let isSent: boolean = false;
                                            console.debug(`new properties (${newProperties.length}) ...`);
                                            for (const property of newProperties) {
                                                if (this.isValidUrl(property.get('Телеграм ссылка'))) {
                                                    const id: any = this.sendProperty(property, user, bot);
                                                    if (id) {
                                                        properties.push(id);
                                                        isSent = true;
                                                    }
                                                }
                                            }
                                            if (isSent) {
                                                this.requestsService.update(request.id, {properties}).then(() => {
                                                    bot.sendMessage(
                                                        user.chatId,
                                                        locales[DEFAULT_LOCALE].foundOptions,
                                                    );
                                                })
                                            }
                                        })
                                    }
                                })
                            } else {
                                const options: any = {
                                    reply_markup: {
                                        inline_keyboard: [
                                            [{
                                                text: locales[DEFAULT_LOCALE].goToWebsite,
                                                switch_inline_query: locales[DEFAULT_LOCALE].goToWebsite,
                                                url: 'https://baliving.ru/tariffs'
                                            }],
                                            [{
                                                text: locales[DEFAULT_LOCALE].writeToSupport,
                                                switch_inline_query: locales[DEFAULT_LOCALE].writeToSupport,
                                                url: 'https://t.me/info_baliving'
                                            }],
                                            [{text: `${locales[DEFAULT_LOCALE].writeAnotherEmail}`, callback_data: `start` }]
                                        ]
                                    }
                                }
                                bot.sendMessage(
                                    user.chatId,
                                    locales[DEFAULT_LOCALE].expired,
                                    options
                                );
                            }
                        } else {
                            const options: any = {
                                reply_markup: {
                                    inline_keyboard: [
                                        [{
                                            text: locales[DEFAULT_LOCALE].goToWebsite,
                                            switch_inline_query: locales[DEFAULT_LOCALE].goToWebsite,
                                            url: 'https://baliving.ru/tariffs'
                                        }],
                                        [{text: `${locales[DEFAULT_LOCALE].writeAnotherEmail}`, callback_data: `start` }]
                                    ]
                                }
                            }
                            bot.sendMessage(
                                user.chatId,
                                locales[DEFAULT_LOCALE].expired,
                                options,
                            );
                        }
                    });
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
            link = link.replace('${id}', property.get('ad_id'));
            template = template.replace('${link}', `<a href="${link}">${locales[DEFAULT_LOCALE].link}</a>`);
            bot.sendMessage(
                user.chatId,
                template,
                options
            );
            return +property.get('Номер');
        } catch (exception) {
            console.error(`issue detected ...\n${exception}`);
            return null;
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