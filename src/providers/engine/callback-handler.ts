import { UsersService } from '../../users/users.service';
import locales from "../../config/locales";
import { User } from "../../users/entities/user.entity";
import Database from "./database";
import areas from "../../config/areas";
import beds from "../../config/beds";
import { RequestsService } from "../../requests/requests.service";

const DEFAULT_LOCALE = 'ru';

const CHOSE = '✅';

const FINISH = 'finish';
const START_SEARCH = 'start-search';
const MENU = 'menu';

const BASE_URL = 'https://baliving.ru/arenda-zhilya-na-bali-na-dlitelnyy-srok?#!/tproduct/499852640-';

const ACTIONS = {
    0: { currentAction: 'ask-email', nextAction: 'read-email' },
    1: { currentAction: 'waiting-for-reply', nextAction: null },
    2: { currentAction: 'waiting-for-reply', nextAction: 'read-areas' },
    3: { currentAction: 'waiting-for-reply', nextAction: 'read-beds' },
    4: { currentAction: 'waiting-for-reply', nextAction: 'read-price' },
    5: { currentAction: 'waiting-for-reply', nextAction: 'confirm' },
    6: { currentAction: 'display-results', nextAction: null },
}

export default class CallbackHandler {
    constructor(
        private readonly usersService: UsersService,
        private readonly requestsService: RequestsService,
        private readonly bot
    ) {}

    async handle(chatId, userId, messageId, data, keyboard) {
        const user: User = await this.usersService.findOne(userId, chatId);
        console.debug(user);
        if (user.nextAction === 'read-areas') {
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
        } else if (user.nextAction === 'confirm') {
            console.log(data);
            if (data === START_SEARCH) {
                await this.handleSearchMessage(messageId, user);
            } else if (data === MENU) {
                // do smth...
            }
        }
    }

    async handleSearchMessage(messageId, user) {
        await this.bot.deleteMessage(user.chatId, messageId);
        await this.usersService.update(user.userId, user.chatId, ACTIONS[6]);
        await this.bot.sendMessage(
            user.chatId,
            locales[DEFAULT_LOCALE].checking,
        );
        const request: any = await this.requestsService.find(+user.requestId);
        console.log(request);
        const databaseProperties: any = await Database.findProperties(request.areas, request.beds, request.price);
        if (databaseProperties.length) {
            await this.bot.sendMessage(
                user.chatId,
                locales[DEFAULT_LOCALE].foundOptions,
            );
            for (const property of databaseProperties) {
                const options: any = {
                    reply_markup: {
                        inline_keyboard: [[{
                            text: locales[DEFAULT_LOCALE].write,
                            switch_inline_query: locales[DEFAULT_LOCALE].write,
                            url: property.get('Телеграм ссылка')
                        }]]
                    }
                }
                let template: string = locales[DEFAULT_LOCALE].finalMessage;
                template = template.replace('${areas}', property.get('Район'));
                template = template.replace('${beds}', property.get('Количество спален'));
                template = template.replace('${price}', property.get('Цена долларов в месяц'));
                let link = BASE_URL + property.get('ad_id');
                template = template.replace('${link}', link);
                await this.bot.sendMessage(
                    user.chatId,
                    template,
                    options
                );
            }
        } else {
            await this.bot.sendMessage(
                user.chatId,
                locales[DEFAULT_LOCALE].notFoundOptions,
            );
        }
    }

    async handleFinishBedMessage(messageId, user, keyboardBeds) {
        await this.bot.deleteMessage(user.chatId, messageId);
        await this.usersService.update(user.userId, user.chatId, ACTIONS[4]);
        let beds = [];
        keyboardBeds.forEach((keyboardBed, index) => {
            if (keyboardBed[0].text[0] === CHOSE) {
                beds.push(index + 1);
            }
        });
        await this.requestsService.update(+user.requestId, { beds });
        const botMessage = await this.bot.sendMessage(
            user.chatId,
            locales[DEFAULT_LOCALE].price
        );
        console.log(`need to remove msg #${botMessage.message_id}`);
        await this.usersService.update(user.userId, user.chatId, { nextAction: `${ACTIONS[4].nextAction},delete-message:${botMessage.message_id}`});
    }

    async handleFinishAreaMessage(messageId, user, keyboardAreas) {
        await this.bot.deleteMessage(user.chatId, messageId);
        if (!user.requestId) {
            const request: any = await this.requestsService.create({ userId: user.id });
            user = await this.usersService.update(user.userId, user.chatId, { ...ACTIONS[3], requestId: request.id });
        } else {
            await this.usersService.update(user.userId, user.chatId, ACTIONS[3]);
        }
        let areas = [];
        keyboardAreas.forEach(keyboardArea => {
            if (keyboardArea[0].text[0] === CHOSE) {
                areas.push(keyboardArea[0].text.substring(2));
            }
        });
        await this.requestsService.update(+user.requestId, { areas });
        let keyboard: any = [];
        beds.forEach((numberOfBeds, index) => {
            keyboard.push([{text: `${numberOfBeds}`, callback_data: `read-beds ${index + 1}` }],)
        })
        const options: any = {
            reply_markup: {
                inline_keyboard: keyboard
            }
        }
        await this.bot.sendMessage(
            user.chatId,
            locales[DEFAULT_LOCALE].numberOfBeds,
            options
        );
    }

    async handleBedMessage(messageId, data, keyboard, user) {
        const numberOfBeds: number = +data.substring("read-beds ".length);
        console.debug(numberOfBeds);
        let newKeyboard = [];
        let hasChosenItems: boolean = false;
        keyboard.forEach((keyboardItem) => {
            let item = [];
            if (keyboardItem[0].text.includes(beds[numberOfBeds - 1])) {
                if (keyboardItem[0].text[0] === CHOSE) {
                    item.push({
                        text: keyboardItem[0].text.substring(2),
                        callback_data: keyboardItem[0].callback_data
                    });
                } else {
                    item.push({
                        text: `${CHOSE} ${keyboardItem[0].text}`,
                        callback_data: keyboardItem[0].callback_data
                    });
                }
            } else {
                item = keyboardItem;
            }
            if (item[0].text[0] === CHOSE) {
                hasChosenItems = true;
            }
            newKeyboard.push(item);
        });
        if (keyboard.length === beds.length && hasChosenItems) {
            newKeyboard.push([{ text: locales[DEFAULT_LOCALE].next, callback_data: FINISH }])
        } else if (!hasChosenItems && keyboard.length > beds.length) {
            newKeyboard.pop();
        }
        await this.bot.deleteMessage(user.chatId, messageId);
        const options: any = {
            reply_markup: {
                inline_keyboard: newKeyboard
            }
        }
        await this.bot.sendMessage(
            user.chatId,
            locales[DEFAULT_LOCALE].chooseAreas,
            options
        );
    }

    async handleAreaMessage(messageId, data, keyboard, user) {
        const area: string = data.substring("read-areas ".length);
        console.debug(area);
        let newKeyboard = [];
        let hasChosenItems: boolean = false;
        keyboard.forEach((keyboardItem) => {
            let item = [];
            if (keyboardItem[0].text.includes(area)) {
                if (keyboardItem[0].text[0] === CHOSE) {
                    item.push({
                        text: keyboardItem[0].text.substring(2),
                        callback_data: keyboardItem[0].callback_data
                    });
                } else {
                    item.push({
                        text: `${CHOSE} ${keyboardItem[0].text}`,
                        callback_data: keyboardItem[0].callback_data
                    });
                }
            } else {
                item = keyboardItem;
            }
            if (item[0].text[0] === CHOSE) {
                hasChosenItems = true;
            }
            newKeyboard.push(item);
        });
        if (keyboard.length === areas.length && hasChosenItems) {
            newKeyboard.push([{ text: locales[DEFAULT_LOCALE].next, callback_data: FINISH }])
        } else if (!hasChosenItems && keyboard.length > beds.length) {
            newKeyboard.pop();
        }
        await this.bot.deleteMessage(user.chatId, messageId);
        const options: any = {
            reply_markup: {
                inline_keyboard: newKeyboard
            }
        }
        await this.bot.sendMessage(
            user.chatId,
            locales[DEFAULT_LOCALE].chooseAreas,
            options
        );
    }
}