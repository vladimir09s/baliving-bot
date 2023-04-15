import { UsersService } from '../../users/users.service';
import locales from "../../config/locales";
import { User } from "../../users/entities/user.entity";
import Database from "./database";
import areas from "../../config/areas";
import beds from "../../config/beds";
import { RequestsService } from "../../requests/requests.service";
import {FetchService} from "nestjs-fetch";

const CHOSE = '✅';
const TRIAL = 'TRIAL';

const FINISH = 'finish';
const START_SEARCH = 'start-search';

const EDIT_AREAS = 'edit-areas';
const EDIT_BEDS = 'edit-beds';
const EDIT_PRICE = 'edit-price';

const CATALOG_URL = 'https://baliving.ru/arenda-zhilya-na-bali-na-dlitelnyy-srok?filters499852640=Popup__find__${id}';

const ACTIONS = {
    0: { currentAction: 'ask-email', nextAction: 'read-email' },
    1: { currentAction: 'waiting-for-reply', nextAction: null },
    2: { currentAction: 'waiting-for-reply', nextAction: 'read-areas' },
    3: { currentAction: 'waiting-for-reply', nextAction: 'read-beds' },
    4: { currentAction: 'waiting-for-reply', nextAction: 'read-price' },
    5: { currentAction: 'waiting-for-reply', nextAction: 'confirm' },
    6: { currentAction: 'display-results', nextAction: null },
    7: { currentAction: 'waiting-for-reply', nextAction: 'read-edit-areas' },
    8: { currentAction: 'waiting-for-reply', nextAction: 'read-edit-beds' },
    9: { currentAction: 'waiting-for-reply', nextAction: 'read-edit-price' },
}

export default class CallbackHandler {
    constructor(
        private readonly usersService: UsersService,
        private readonly requestsService: RequestsService,
        private readonly bot,
        private readonly fetch: FetchService,
    ) {}

    async handle(chatId, userId, messageId, data, keyboard) {
        const user: User = await this.usersService.findOne(userId, chatId);
        console.debug(user);
        try {
            if (data === 'start') {
                await this.handleStartMessage(chatId, userId, user);
            } else if (user.nextAction === 'read-areas') {
                if (data === FINISH) {
                    await this.handleFinishAreaMessage(messageId, user, keyboard);
                } else {
                    await this.handleAreaMessage(messageId, data, keyboard, user);
                }
            } else if (user.nextAction === 'read-beds') {
                if (data === FINISH) {
                    await this.handleFinishBedMessage(messageId, user, keyboard);
                } else {
                    await this.handleBedMessage(messageId, data, keyboard, user);
                }
            } else if ([EDIT_AREAS, EDIT_BEDS, EDIT_PRICE].includes(data)) {
                const isValid: boolean = await this.isValidUser(user);
                if (isValid) {
                    switch (data) {
                        case EDIT_AREAS:
                            await this.handleEditAreasMessage(messageId, user);
                            break;
                        case EDIT_BEDS:
                            await this.handleEditBedsMessage(messageId, user);
                            break;
                        case EDIT_PRICE:
                            await this.handleEditPriceMessage(messageId, user);
                            break;
                    }
                }
            } else if (user.nextAction === 'confirm') {
                console.log(data);
                if (data === START_SEARCH) {
                    await this.handleSearchMessage(messageId, user);
                }
            } else if (user.nextAction && user.nextAction.includes('read-edit')) {
                if (user.nextAction.includes('read-edit-areas')) {
                    if (data === FINISH) {
                        await this.handleFinishAreaMessage(messageId, user, keyboard, true);
                    } else if (data.includes('read-areas')) {
                        await this.handleAreaMessage(messageId, data, keyboard, user);
                    }
                }
                if (user.nextAction.includes('read-edit-beds')) {
                    if (data === FINISH) {
                        await this.handleFinishBedMessage(messageId, user, keyboard, true);
                    } else if (data.includes('read-beds')) {
                        await this.handleBedMessage(messageId, data, keyboard, user);
                    }
                }
            }
        } catch (exception) {
            console.error(exception);
        }
    }

    async handleStartMessage(chatId, userId, user) {
        await this.usersService.update(userId, chatId, { ...ACTIONS[0], requestId: null });
        await this.bot.sendMessage(
            chatId,
            locales[user.locale].start,
        );
    }

    async handleEditAreasMessage(messageId, user) {
        const request: any = await this.requestsService.find(+user.requestId);
        await this.usersService.update(user.userId, user.chatId, ACTIONS[7]);
        let keyboard: any = [];
        let hasChosenItems = false;
        areas[user.locale].forEach(area => {
            let requestAreas: any = [];
            if (request.areas) {
                if (user.locale === 'en') {
                    request.areas.forEach(area => {
                        requestAreas.push(areas[user.locale][areas['ru'].indexOf(area)]);
                    });
                } else {
                    requestAreas = request.areas;
                }
            }
            const text = requestAreas.includes(area) ? `${CHOSE} ${area}` : `${area}`;
            keyboard.push({text, callback_data: `read-areas ${area}` })
            if (text[0] === CHOSE) {
                hasChosenItems = true;
            }
        });
        const inlineKeyboard: any = [];
        const rows = this.sliceIntoChunks(keyboard, 2); // 2 cols in a row
        rows.forEach(row => {
            inlineKeyboard.push(row);
        })
        if (keyboard.length === areas[user.locale].length && hasChosenItems) {
            inlineKeyboard.push([{ text: locales[user.locale].next, callback_data: FINISH }])
        } else if (!hasChosenItems && keyboard.length > areas[user.locale].length) {
            inlineKeyboard.pop();
        }
        const options: any = {
            reply_markup: {
                inline_keyboard: inlineKeyboard
            }
        }
        await this.bot.sendMessage(
            user.chatId,
            locales[user.locale].chooseAreas,
            options
        );
    }

    async handleEditBedsMessage(messageId, user) {
        const request: any = await this.requestsService.find(+user.requestId);
        await this.usersService.update(user.userId, user.chatId, ACTIONS[8]);
        let keyboard: any = [];
        let hasChosenItems = false;
        beds.forEach((numberOfBeds, index) => {
            const text = request.beds && request.beds.includes(`${index + 1}`) ? `${CHOSE} ${numberOfBeds}` : `${numberOfBeds}`;
            keyboard.push({ text, callback_data: `read-beds ${index + 1}` })
            if (text[0] === CHOSE) {
                hasChosenItems = true;
            }
        });
        const inlineKeyboard: any = [];
        const rows = this.sliceIntoChunks(keyboard, 2); // 2 cols in a row
        rows.forEach(row => {
            inlineKeyboard.push(row);
        })
        if (keyboard.length === beds.length && hasChosenItems) {
            inlineKeyboard.push([{ text: locales[user.locale].next, callback_data: FINISH }])
        } else if (!hasChosenItems && keyboard.length > beds.length) {
            inlineKeyboard.pop();
        }
        const options: any = {
            reply_markup: {
                inline_keyboard: inlineKeyboard
            }
        }
        await this.bot.sendMessage(
            user.chatId,
            locales[user.locale].numberOfBeds,
            options
        );
    }

    async handleEditPriceMessage(messageId, user) {
        console.debug(messageId);
        await this.usersService.update(user.userId, user.chatId, ACTIONS[9]);
        const botMessage = await this.bot.sendMessage(
            user.chatId,
            locales[user.locale].price
        );
        await this.usersService.update(
            user.userId,
            user.chatId,
            { nextAction: `${ACTIONS[9].nextAction},delete-message:${botMessage.message_id}` }
        );
    }

    async isValidUser(user) {
        this.bot.sendMessage(
            user.chatId,
            locales[user.locale].checking,
        );
        const databaseUser: any = await Database.findUser(user.email);
        const options: any = {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: locales[user.locale].goToWebsite,
                        switch_inline_query: locales[user.locale].goToWebsite,
                        url: 'https://baliving.ru/tariffs'
                    }],
                    [{text: `${locales[user.locale].writeAnotherEmail}`, callback_data: `start` }]
                ]
            }
        }
        if (!databaseUser) {
            await this.usersService.update(user.userId, user.chatId, ACTIONS[1]);
            await this.bot.sendMessage(
                user.chatId,
                locales[user.locale].notFound,
                options,
            );
            return false;
        } else if (
            databaseUser.get('Доступ действителен') === CHOSE &&
            databaseUser.get('Plan') === 'VIP' ||
            databaseUser.get('TRIAL') === TRIAL
        ) {
            await this.usersService.update(user.userId, user.chatId, {
                isTrial: databaseUser.get('TRIAL') === TRIAL
            });
            return true;
        } else {
            await this.usersService.update(user.userId, user.chatId, ACTIONS[1]);
            await this.bot.sendMessage(
                user.chatId,
                locales[user.locale].expired,
                options,
            );
            return false;
        }
    }

    async handleSearchMessage(messageId, user) {
        // await this.bot.editMessageReplyMarkup(user.chatId, messageId, null, null);
        await this.usersService.update(user.userId, user.chatId, ACTIONS[6]);
        await this.bot.sendMessage(
            user.chatId,
            locales[user.locale].checking,
        );
        const request: any = await this.requestsService.find(+user.requestId);
        console.log(request);
        const databaseProperties: any = await Database.findProperties(request.areas, request.beds, request.price);
        if (databaseProperties.length) {
            const properties: number[] = [];
            let isSent: boolean = false;
            for (const property of databaseProperties) {
                if (this.isValidUrl(property.get('Телеграм ссылка'))) {
                    const id: any = await this.sendProperty(property, user);
                    if (id) {
                        properties.push(id);
                        isSent = true;
                    }
                }
            }
            if (isSent) {
                await this.requestsService.update(request.id, { properties });
                await this.bot.sendMessage(
                    user.chatId,
                    locales[user.locale].foundOptions,
                );
            }
        } else {
            await this.bot.sendMessage(
                user.chatId,
                locales[user.locale].notFoundOptions,
            );
        }
    }

    async sendProperty(property, user) {
        try {
            let options: any = {
                parse_mode: 'html'
            };
            if (!user.isTrial) {
                options.reply_markup = {
                    inline_keyboard: [[{
                        text: locales[user.locale].write,
                        switch_inline_query: locales[user.locale].write,
                        url: property.get('Телеграм ссылка')
                    }]]
                };
            }

            let template: string = locales[user.locale].finalMessage;
            if (property.get('Заголовок') && user.locale === 'ru') {
                template = `${property.get('Заголовок')}\n${template}`;
            } else if (property.get('Title eng') && user.locale === 'en') {
                template = `${property.get('Title eng')}\n${template}`;
            }
            let templateArea: string = '';
            if (user.locale === 'ru') {
                templateArea = property.get('Район');
            } else if (user.locale === 'en') {
                templateArea = property.get('District');
            }
            template = template.replace('${areas}', templateArea);
            template = template.replace('${beds}', property.get('Количество спален'));
            template = template.replace('${price}', property.get('Цена долларов в месяц'));
            let link = CATALOG_URL;
            link = link.replace('${id}', property.get('ad_id'));
            template = template.replace('${link}', `<a href="${link}">${locales[user.locale].link}</a>`);

            await this.bot.sendMessage(
                user.chatId,
                template,
                options
            );

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
                        await this.bot.sendPhoto(user.chatId, item.media.source, {
                            parse_mode: 'markdown',
                        });
                    }
                }
            }

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

    async handleFinishBedMessage(messageId, user, keyboardBeds, isEdit = false) {
        await this.bot.deleteMessage(user.chatId, messageId);
        const actionData = isEdit ? ACTIONS[5] : ACTIONS[4];
        await this.usersService.update(user.userId, user.chatId, actionData);
        const keyboardItems: any = [];
        keyboardBeds.forEach(subKeyboard => {
            subKeyboard.forEach(subKeyboardItem => {
                keyboardItems.push(subKeyboardItem);
            })
        })
        let beds = [];
        keyboardItems.forEach((keyboardBed, index) => {
            if (keyboardBed.text[0] === CHOSE) {
                beds.push(index + 1);
            }
        });
        const request: any = await this.requestsService.update(+user.requestId, { beds });
        if (isEdit) {
            await this.bot.sendMessage(
                user.chatId,
                locales[user.locale].finish,
                { parse_mode: 'html' }
            );
            const options: any = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: locales[user.locale].agree, callback_data: 'start-search' }],
                    ]
                }
            }
            let template: string = locales[user.locale].details;
            let requestAreas: any = [];
            if (user.locale === 'en') {
                request.areas.forEach(area => {
                    requestAreas.push(areas[user.locale][areas['ru'].indexOf(area)]);
                });
            } else {
                requestAreas = request.areas;
            }
            template = template.replace('${areas}', requestAreas.join(','));
            template = template.replace('${beds}', request.beds.join(','));
            template = template.replace('${price}', request.price);
            await this.bot.sendMessage(
                user.chatId,
                template,
                options
            );
        } else {
            const botMessage = await this.bot.sendMessage(
                user.chatId,
                locales[user.locale].price
            );
            await this.usersService.update(user.userId, user.chatId, { nextAction: `${ACTIONS[4].nextAction},delete-message:${botMessage.message_id}`});
        }
    }

    async handleFinishAreaMessage(messageId, user, keyboardAreas, isEdit = false) {
        await this.bot.deleteMessage(user.chatId, messageId);
        const actionData = isEdit ? ACTIONS[5] : ACTIONS[3];
        if (!user.requestId) {
            const request: any = await this.requestsService.create({ userId: user.id });
            user = await this.usersService.update(user.userId, user.chatId, { ...actionData, requestId: request.id });
        } else {
            await this.usersService.update(user.userId, user.chatId, actionData);
        }
        let userAreas: any = [];
        const keyboardItems: any = [];
        keyboardAreas.forEach(subKeyboard => {
            subKeyboard.forEach(subKeyboardItem => {
                keyboardItems.push(subKeyboardItem);
            })
        })
        keyboardItems.forEach(keyboardArea => {
            if (keyboardArea.text[0] === CHOSE) {
                const areaItem: string = keyboardArea.text.substring(2);
                if (user.locale === 'en') {
                    userAreas.push(areas['ru'][areas[user.locale].indexOf(areaItem)])
                } else {
                    userAreas.push(areaItem);
                }
            }
        });
        const request: any = await this.requestsService.update(+user.requestId, { areas: userAreas });
        if (isEdit) {
            await this.bot.sendMessage(
                user.chatId,
                locales[user.locale].finish,
                { parse_mode: 'html' }
            );
            const options: any = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: locales[user.locale].agree, callback_data: 'start-search' }],
                    ]
                }
            }
            let template: string = locales[user.locale].details;
            let requestAreas: any = [];
            if (user.locale === 'en') {
                request.areas.forEach(area => {
                    requestAreas.push(areas[user.locale][areas['ru'].indexOf(area)]);
                });
            } else {
                requestAreas = request.areas;
            }
            template = template.replace('${areas}', requestAreas.join(','));
            template = template.replace('${beds}', request.beds.join(','));
            template = template.replace('${price}', request.price);
            await this.bot.sendMessage(
                user.chatId,
                template,
                options
            );
        } else {
            let keyboard: any = [];
            beds.forEach((numberOfBeds, index) => {
                keyboard.push({text: `${numberOfBeds}`, callback_data: `read-beds ${index + 1}` })
            })
            const inlineKeyboard: any = [];
            const rows = this.sliceIntoChunks(keyboard, 2); // 2 cols in a row
            rows.forEach(row => {
                inlineKeyboard.push(row);
            })
            const options: any = {
                reply_markup: {
                    inline_keyboard: inlineKeyboard
                }
            }
            await this.bot.sendMessage(
                user.chatId,
                locales[user.locale].numberOfBeds,
                options
            );
        }
    }

    async handleBedMessage(messageId, data, keyboard, user) {
        const keyboardItems: any = [];
        keyboard.forEach(subKeyboard => {
            subKeyboard.forEach(subKeyboardItem => {
                keyboardItems.push(subKeyboardItem);
            })
        })
        const numberOfBeds: number = +data.substring("read-beds ".length);
        console.debug(numberOfBeds);
        let newKeyboard = [];
        let hasChosenItems: boolean = false;
        keyboardItems.forEach((keyboardItem) => {
            let item = null;
            if (keyboardItem.text.includes(beds[numberOfBeds - 1])) {
                if (keyboardItem.text[0] === CHOSE) {
                    item = {
                        text: keyboardItem.text.substring(2),
                        callback_data: keyboardItem.callback_data
                    };
                } else {
                    item = {
                        text: `${CHOSE} ${keyboardItem.text}`,
                        callback_data: keyboardItem.callback_data
                    };
                }
            } else {
                item = keyboardItem;
            }
            if (item.text[0] === CHOSE) {
                hasChosenItems = true;
            }
            newKeyboard.push(item);
        });
        const inlineKeyboard: any = [];
        const rows = this.sliceIntoChunks(newKeyboard, 2); // 2 cols in a row
        rows.forEach(row => {
            inlineKeyboard.push(row);
        })
        if (keyboardItems.length === beds.length && hasChosenItems) {
            inlineKeyboard.push([{ text: locales[user.locale].next, callback_data: FINISH }])
        } else if (!hasChosenItems && keyboardItems.length > beds.length) {
            inlineKeyboard.pop();
        }
        await this.bot.deleteMessage(user.chatId, messageId);
        const options: any = {
            reply_markup: {
                inline_keyboard: inlineKeyboard
            }
        }
        await this.bot.sendMessage(
            user.chatId,
            locales[user.locale].chooseAreas,
            options
        );
    }

    sliceIntoChunks(array, size) {
        const result = [];
        for (let i = 0; i < array.length; i += size) {
            const chunk = array.slice(i, i + size);
            result.push(chunk);
        }
        return result;
    }

    async handleAreaMessage(messageId, data, keyboard, user) {
        console.debug(keyboard);
        const keyboardItems: any = [];
        keyboard.forEach(subKeyboard => {
            subKeyboard.forEach(subKeyboardItem => {
                keyboardItems.push(subKeyboardItem);
            })
        })
        const area: string = data.substring("read-areas ".length);
        console.debug(area);
        let newKeyboard = [];
        let hasChosenItems: boolean = false;
        keyboardItems.forEach((keyboardItem) => {
            let item = null;
            if (keyboardItem.text.includes(area)) {
                if (keyboardItem.text[0] === CHOSE) {
                    item = {
                        text: keyboardItem.text.substring(2),
                        callback_data: keyboardItem.callback_data
                    };
                } else {
                    item = {
                        text: `${CHOSE} ${keyboardItem.text}`,
                        callback_data: keyboardItem.callback_data
                    };
                }
            } else {
                item = keyboardItem;
            }
            if (item.text[0] === CHOSE) {
                hasChosenItems = true;
            }
            newKeyboard.push(item);
        });
        const inlineKeyboard: any = [];
        const rows = this.sliceIntoChunks(newKeyboard, 2); // 2 cols in a row
        rows.forEach(row => {
            inlineKeyboard.push(row);
        })
        if (keyboardItems.length === areas[user.locale].length && hasChosenItems) {
            inlineKeyboard.push([{ text: locales[user.locale].next, callback_data: FINISH }]);
        } else if (!hasChosenItems && keyboardItems.length > areas[user.locale].length) {
            inlineKeyboard.pop();
        }
        await this.bot.deleteMessage(user.chatId, messageId);
        const options: any = {
            reply_markup: {
                inline_keyboard: inlineKeyboard
            }
        }
        await this.bot.sendMessage(
            user.chatId,
            locales[user.locale].chooseAreas,
            options
        );
    }
}