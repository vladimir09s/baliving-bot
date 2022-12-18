import { Injectable } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Request } from "./entities/request.entity";

@Injectable()
export class RequestsService {
  constructor(
      @InjectRepository(Request)
      private requestsRepository: Repository<Request>,
  ) {}
  async create(attributes) {
    const request = this.requestsRepository.create(attributes);
    return await this.requestsRepository.save(request);
  }

  async findOne(userId: number) {
    const exists: boolean = await this.requestsRepository.exist({ where: { userId } });
    if (exists) {
      return await this.requestsRepository.findOneBy({ userId });
    } else {
      const request = this.requestsRepository.create({ userId });
      return await this.requestsRepository.save(request);
    }
  }

  async update(userId: number, attributes) {
    const request: Request = await this.findOne(userId);
    return await this.requestsRepository.save({ ...request, ...attributes });
  }
}
