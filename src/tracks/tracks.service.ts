import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from './track.entity';

export interface ParsedTrackRow {
  externalId: string;
  status: string;
  invoiceCode: string;
  origin: string;
  destination: string;
  value: number;
  openedAt: Date;
  scheduled: string;
}

@Injectable()
export class TracksService {
  constructor(
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>
  ) {}

  findByAccountId(accountId: string) {
    return this.trackRepository.find({
      where: { accountId },
      order: { createdAt: 'DESC' }
    });
  }

  async upsertTracks(accountId: string, rows: ParsedTrackRow[]) {
    if (!rows.length) {
      return { inserted: 0, updated: 0 };
    }

    const existing = await this.trackRepository.find({ where: { accountId } });
    const map = new Map(existing.map((t) => [t.externalId, t]));

    let inserted = 0;
    let updated = 0;

    const entities = rows.map((row) => {
      const found = map.get(row.externalId);
      if (found) {
        updated += 1;
        found.status = row.status;
        return found;
      }

      inserted += 1;

      return this.trackRepository.create({
        accountId,
        externalId: row.externalId,
        status: row.status,
        startedAt: row.openedAt,
        deliveryEstimate: row.scheduled,
        invoiceCode: row.invoiceCode,
        destination: row.destination,
        origin: row.origin,
        value: row.value
      });
    });

    await this.trackRepository.save(entities);

    return { inserted, updated };
  }
}
