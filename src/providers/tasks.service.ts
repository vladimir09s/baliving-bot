import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {UsersService} from "../users/users.service";
import {RequestsService} from "../requests/requests.service";
import Database from "./engine/database";
import locales from "../config/locales";
import {FetchService} from "nestjs-fetch";
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const DEFAULT_LOCALE = 'ru';

const CATALOG_URL = 'https://baliving.ru/arenda-zhilya-na-bali-na-dlitelnyy-srok?filters499852640=Popup__find__${id}';

const CHOSE = '✅';
const TRIAL = 'TRIAL';

@Injectable()
export class TasksService {
    constructor(
        private readonly usersService: UsersService,
        private readonly requestsService: RequestsService,
        private readonly fetch: FetchService
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
                            if (databaseUser.get('TRIAL') === TRIAL) {
                                this.handleActiveUser(bot, user, true);
                            } else if (databaseUser.get('Plan') === 'VIP') {
                                this.handleActiveUser(bot, user);
                            } else {
                                this.handleUndefinedActiveUser(bot, user);
                            }
                        } else {
                            this.handleExpiredUser(bot, user);
                        }
                    });
                }
            })
        })
    }

    handleActiveUser(bot, user, isTrial = false) {
        this.requestsService.find(+user.requestId).then(request => {
            if (request.areas && request.beds && request.price) {
                const properties: any = request.properties ? request.properties : [];
                console.debug(properties);
                Database.findNewProperties(request.areas, request.beds, request.price, properties).then(async (newProperties) => {
                    let isSent: boolean = false;
                    console.debug(`new properties (${newProperties.length}) ...`);
                    for (const property of newProperties) {
                        if (this.isValidUrl(property.get('Телеграм ссылка'))) {
                            const id: any = await this.sendProperty(property, user, bot, isTrial);
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
    }

    handleUndefinedActiveUser(bot, user) {
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
        ).then(() => {
            this.usersService.delete(user.userId)
                .then(r => console.debug(r))
        });
    }

    handleExpiredUser(bot, user) {
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
        ).then(() => {
            this.usersService.delete(user.userId)
                .then(response => console.debug(response))
        });
    }

    async sendProperty(property, user, bot, isTrial = false) {
        try {
            let options: any = {
                parse_mode: 'html'
            };
            if (!isTrial) {
                options.reply_markup = {
                    inline_keyboard: [[{
                        text: locales[DEFAULT_LOCALE].write,
                        switch_inline_query: locales[DEFAULT_LOCALE].write,
                        url: property.get('Телеграм ссылка')
                    }]]
                };
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
            await bot.sendMessage(
                user.chatId,
                template,
                options
            );

            await this.handlePhotos(property, user, bot);

            return +property.get('Номер');
        } catch (exception) {
            console.error(`issue detected ...\n${exception}`);
            return null;
        }
    }

    async handlePhotos(property, user, bot) {
        if (property.get('Фото') && Array.isArray(property.get('Фото'))) {
            console.debug('Photo is processing...');
            let media: any = [];
            const images = property.get('Фото').map(image => image.thumbnails.large.url);
            for (const url of images) {
                const i = images.indexOf(url);
                if (i < 3) { // limit = 3
                    const response = await this.fetch.get(url);
                    const buffer = await response.arrayBuffer();
                    media.push({
                        type: 'photo',
                        media: {source: Buffer.from(buffer), filename: `image_${i}.jpg` }
                    });
                }
            }
            if (media.length) {
                for (const item of media) {
                    await bot.sendPhoto(user.chatId, item.media.source, {
                        parse_mode: 'markdown',
                    });
                }
            }
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