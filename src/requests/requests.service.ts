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

  async find(id: number) {
    return await this.requestsRepository.findOneBy({ id });
  }

  async update(id: number, attributes) {
    const request: Request = await this.find(id);
    return await this.requestsRepository.save({ ...request, ...attributes });
  }
}
