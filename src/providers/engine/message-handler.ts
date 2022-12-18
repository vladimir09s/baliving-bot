import { UsersService } from '../../users/users.service';
import locales from "../../config/locales";
import { User } from "../../users/entities/user.entity";
import Database from "./database";
import areas from "../../config/areas";
import { RequestsService } from "../../requests/requests.service";

const START_COMMAND: string = '/start';

const DEFAULT_LOCALE = 'ru';

const CHOSE = '✅';

const ACTIONS = {
    0: { currentAction: 'ask-email', nextAction: 'read-email' },
    1: { currentAction: 'waiting-for-reply', nextAction: null },
    2: { currentAction: 'waiting-for-reply', nextAction: 'read-areas' },
    3: { currentAction: 'waiting-for-reply', nextAction: 'read-beds' },
    4: { currentAction: 'waiting-for-reply', nextAction: 'read-price' },
    5: { currentAction: 'waiting-for-reply', nextAction: 'confirm' },
    6: { currentAction: 'display-results', nextAction: null },
}

export default class MessageHandler {
    constructor(
        private readonly usersService: UsersService,
        private readonly requestsService: RequestsService,
        protected readonly bot
    ) {}
    async handle(message) {
        const chatId: number = message.chat.id;
        const userId: number = message.from.id;
        const user: User = await this.usersService.findOne(userId, chatId);
        console.debug(user);
        console.debug(message);
        try {
            if (message.text.toString() === START_COMMAND) {
                await this.handleStartMessage(message, user);
            } else if (user.nextAction === 'read-email') {
                await this.handleEmailMessage(message, user);
            } else if (user.nextAction.includes('read-price')) {
                await this.handlePriceMessage(message, user);
            }
        } catch (exception) {
            console.error(exception);
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
            console.debug(message);
            const request: any = await this.requestsService.update(+user.requestId, { price });
            if (user.nextAction.includes('delete-message')) {
                await this.bot.deleteMessage(user.chatId, +user.nextAction.substring(user.nextAction.indexOf(':') + 1))
            }
            await this.bot.deleteMessage(user.chatId, message.message_id);
            await this.usersService.update(user.userId, user.chatId, ACTIONS[5]);
            await this.bot.sendMessage(
                message.chat.id,
                locales[DEFAULT_LOCALE].finish,
            );
            const options: any = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: locales[DEFAULT_LOCALE].agree, callback_data: 'start-search' }],
                        [{ text: locales[DEFAULT_LOCALE].menu, callback_data: 'menu' }],
                    ]
                }
            }
            let template: string = locales[DEFAULT_LOCALE].details;
            console.debug(request);
            template = template.replace('${areas}', request.areas.join(','));
            template = template.replace('${beds}', request.beds.join(','));
            template = template.replace('${price}', request.price);
            await this.bot.sendMessage(
                message.chat.id,
                template,
                options
            );
        }
    }

    async handleStartMessage(message, user) {
        await this.usersService.update(user.userId, user.chatId, { ...ACTIONS[0], requestId: null });
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