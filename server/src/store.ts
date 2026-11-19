import type { Room } from '@whatnow/shared';

/** In-memory room storage. No database: rooms live as long as the server process. */
export class RoomStore {
  private readonly rooms = new Map<string, Room>();

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  has(code: string): boolean {
    return this.rooms.has(code);
  }

  set(room: Room): void {
    this.rooms.set(room.code, room);
  }

  delete(code: string): void {
    this.rooms.delete(code);
  }

  get size(): number {
    return this.rooms.size;
  }
}
