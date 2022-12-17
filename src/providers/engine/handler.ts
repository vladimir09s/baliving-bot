import { UsersService } from '../../users/users.service';
import locales from "../../config/locales";
import { User } from "../../users/entities/user.entity";
import Database from "./database";

const START_COMMAND: string = '/start';

const DEFAULT_LOCALE = 'ru';

const ACTIONS = {
    0: { currentAction: 'ask-email', nextAction: 'read-email' },
    1: { currentAction: 'start-survey', nextAction: 'collect-survey' },
}

export default class Handler {
    constructor(private readonly usersService: UsersService) {}
    async handle(bot, message) {
        const chatId: number = message.chat.id;
        const userId: number = message.from.id;
        let user: User = await this.usersService.findOne(userId, chatId);
        console.debug(user);
        if (message.text.toString() === START_COMMAND) {
            await this.handleStartMessage(bot, message, user);
        } else if (user.nextAction === 'read-email') {
            await this.handleEmailMessage(bot, message, user);
        }
    }

    async handleStartMessage(bot, message, user) {
        await this.usersService.update(user.userId, user.chatId, ACTIONS[0]);
        bot.sendMessage(
            message.chat.id,
            locales[DEFAULT_LOCALE].start,
        );
    }

    async handleEmailMessage(bot, message, user) {
        const email: string = message.text.toString().toLowerCase();
        await this.usersService.update(user.userId, user.chatId, { email });
        const databaseUser: any = await Database.findUser(email);
        if (!databaseUser) {
            bot.sendMessage(
                message.chat.id,
                locales[DEFAULT_LOCALE].notFound,
            );
        } else if (databaseUser.get('Доступ действителен') === '✅') {
            bot.sendMessage(
                message.chat.id,
                locales[DEFAULT_LOCALE].chooseAreas,
            );
        } else {
            bot.sendMessage(
                message.chat.id,
                locales[DEFAULT_LOCALE].expired,
            );
        }
    }
}