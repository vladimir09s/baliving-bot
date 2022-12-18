import { UsersService } from '../../users/users.service';
import { RequestsService } from "../../requests/requests.service";
import CallbackHandler from "./callback-handler";
import MessageHandler from "./message-handler";

export default class Handler {
    private readonly callbackHandler: CallbackHandler;
    private readonly messageHandler: MessageHandler;

    constructor(
        usersService: UsersService,
        requestsService: RequestsService,
        protected readonly bot
    ) {
        this.callbackHandler = new CallbackHandler(usersService, requestsService, bot);
        this.messageHandler = new MessageHandler(usersService, requestsService, bot);
    }

    async handle(message) {
        await this.messageHandler.handle(message);
    }

    async handleCallback(chatId, userId, messageId, data, keyboard) {
        await this.callbackHandler.handle(chatId, userId, messageId, data, keyboard);
    }
}