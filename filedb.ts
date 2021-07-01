export class FileDB {
  items: { name: string, contents: string }[] = [];
  primaryFile: string | undefined;

  setPrimaryFile(name: string): void {
    this.primaryFile = name;
  }

  add(item: { name: string, contents: string }): void {
    this.items.push(item);
  }

  serialize(): Buffer {
    const b: Buffer[] = [];

    if (this.primaryFile === undefined) {
      throw new Error("NO PRIMARY FILE!")
    }

    const primaryFileNameLength = Buffer.alloc(2);
    primaryFileNameLength.writeUInt16LE(this.primaryFile.length);

    b.push(primaryFileNameLength);
    b.push(Buffer.from(this.primaryFile, "utf-8"))

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const nameLength = Buffer.alloc(2);
      nameLength.writeUInt16LE(item.name.length);

      const name = Buffer.from(item.name, "utf-8")
      const length = Buffer.alloc(4);
      const data = Buffer.from(item.contents, "utf-8");
      length.writeUInt32LE(data.length);

      const padding = Buffer.alloc(1);
      padding.writeUInt8(i == this.items.length - 1 ? 1 : 0);

      b.push(nameLength, name, length, data, padding);
    }

    return Buffer.concat(b);
  }
}
