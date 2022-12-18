import { UsersService } from '../../users/users.service';
import locales from "../../config/locales";
import { User } from "../../users/entities/user.entity";
import { Request } from "../../requests/entities/request.entity";
import Database from "./database";
import areas from "../../config/areas";
import beds from "../../config/beds";
import { RequestsService } from "../../requests/requests.service";

const START_COMMAND: string = '/start';

const DEFAULT_LOCALE = 'ru';

const CHOSE = '✅';

const FINISH = 'finish';

const ACTIONS = {
    0: { currentAction: 'ask-email', nextAction: 'read-email' },
    1: { currentAction: 'waiting-for-reply', nextAction: null },
    2: { currentAction: 'waiting-for-reply', nextAction: 'read-areas' },
    3: { currentAction: 'waiting-for-reply', nextAction: 'read-beds' },
    4: { currentAction: 'waiting-for-reply', nextAction: 'read-price' },
    5: { currentAction: 'waiting-for-reply', nextAction: 'confirm' },
    6: { currentAction: 'display-results', nextAction: null },
}

export default class Handler {
    constructor(
        private readonly usersService: UsersService,
        private readonly requestsService: RequestsService,
        protected readonly bot
    ) {}
    async handle(message) {
        const chatId: number = message.chat.id;
        const userId: number = message.from.id;
        let user: User = await this.usersService.findOne(userId, chatId);
        console.debug(user);
        if (message.text.toString() === START_COMMAND) {
            await this.handleStartMessage(message, user);
        } else if (user.nextAction === 'read-email') {
            await this.handleEmailMessage(message, user);
        } else if (user.nextAction === 'read-price') {
            await this.handlePriceMessage(message, user);
        }
    }

    async handleCallback(chatId, userId, messageId, data, keyboard) {
        let user: User = await this.usersService.findOne(userId, chatId);
        console.debug(user);
        if (user.nextAction === 'read-areas') {
            if (data === FINISH) {
                await this.handleFinishAreaMessage(messageId, user);
            } else {
                await this.handleAreaMessage(messageId, data, keyboard, user);
            }
        } else if (user.nextAction === 'read-beds') {
            if (data === FINISH) {
                await this.handleFinishBedMessage(messageId, user);
            } else {
                await this.handleBedMessage(messageId, data, keyboard, user);
            }
        }
    }

    async handlePriceMessage(message, user) {
        const price: number = +message.text;
        console.debug(price);
        if (Number.isNaN(price)) {
            await this.bot.sendMessage(
                user.chatId,
                locales[DEFAULT_LOCALE].price
            );
        } else {
            // await this.bot.deleteMessage(user.chatId, message.id);
            // await this.bot.deleteMessage(user.chatId, message.id - 1);
            await this.usersService.update(user.userId, user.chatId, ACTIONS[5]);
            this.bot.sendMessage(
                message.chat.id,
                locales[DEFAULT_LOCALE].finish,
            );
        }
    }

    async handleFinishBedMessage(messageId, user) {
        await this.bot.deleteMessage(user.chatId, messageId);
        await this.usersService.update(user.userId, user.chatId, ACTIONS[4]);
        await this.bot.sendMessage(
            user.chatId,
            locales[DEFAULT_LOCALE].price
        );
    }

    async handleFinishAreaMessage(messageId, user) {
        await this.bot.deleteMessage(user.chatId, messageId);
        await this.usersService.update(user.userId, user.chatId, ACTIONS[3]);
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
            newKeyboard.push(item);
        });
        if (keyboard.length === beds.length) {
            newKeyboard.push([{ text: locales[DEFAULT_LOCALE].next, callback_data: FINISH }])
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
            newKeyboard.push(item);
        });
        if (keyboard.length === areas.length) {
            newKeyboard.push([{ text: locales[DEFAULT_LOCALE].next, callback_data: FINISH }])
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

    async handleStartMessage(message, user) {
        await this.usersService.update(user.userId, user.chatId, ACTIONS[0]);
        this.bot.sendMessage(
            message.chat.id,
            locales[DEFAULT_LOCALE].start,
        );
    }

    async handleEmailMessage(message, user) {
        const email: string = message.text.toString().toLowerCase();
        await this.usersService.update(user.userId, user.chatId, { email });
        this.bot.sendMessage(
            message.chat.id,
            locales[DEFAULT_LOCALE].checking,
        );
        const databaseUser: any = await Database.findUser(email);
        if (!databaseUser) {
            await this.usersService.update(user.userId, user.chatId, ACTIONS[1]);
            this.bot.sendMessage(
                message.chat.id,
                locales[DEFAULT_LOCALE].notFound,
            );
        } else if (databaseUser.get('Доступ действителен') === CHOSE) {
            await this.usersService.update(user.userId, user.chatId, ACTIONS[2]);
            let keyboard: any = [];
            areas.forEach(area => {
                keyboard.push([{text: `${area}`, callback_data: `read-areas ${area}` }],)
            })
            const options: any = {
                reply_markup: {
                    inline_keyboard: keyboard
                }
            }
            this.bot.sendMessage(
                message.chat.id,
                locales[DEFAULT_LOCALE].chooseAreas,
                options
            );
        } else {
            await this.usersService.update(user.userId, user.chatId, ACTIONS[1]);
            this.bot.sendMessage(
                message.chat.id,
                locales[DEFAULT_LOCALE].expired,
            );
        }
    }
}