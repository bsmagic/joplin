// This driver allows storing the content directly with the item row in the
// database (as a binary blob). For now the driver expects that the content is
// stored in the same table as the items, as it originally was.

import { DatabaseConfigClient } from '../../utils/types';
import ContentDriverBase, { Context, Options as BaseOptions } from './ContentDriverBase';

interface Options extends BaseOptions {
	dbClientType: DatabaseConfigClient;
}

export default class ContentDriverDatabase extends ContentDriverBase {

	private handleReturnedRows_: boolean = null;

	public constructor(options: Options) {
		super(options);

		this.handleReturnedRows_ = options.dbClientType === DatabaseConfigClient.PostgreSQL;
	}

	public async write(itemId: string, content: Buffer, context: Context): Promise<void> {
		const returningOption = this.handleReturnedRows_ ? ['id'] : undefined;

		const updatedRows = await context.models.item().db('items').update({ content }, returningOption).where('id', '=', itemId);
		if (!this.handleReturnedRows_) return;

		// Not possible because the ID is unique
		if (updatedRows.length > 1) throw new Error('Update more than one row');

		// Not possible either because the row is created before this handler is called, but still could happen
		if (!updatedRows.length) throw new Error(`No such item: ${itemId}`);

		// That would be weird
		if (updatedRows[0].id !== itemId) throw new Error(`Did not update the right row. Expected: ${itemId}. Got: ${updatedRows[0].id}`);
	}

	public async read(itemId: string, context: Context): Promise<Buffer | null> {
		const row = await context.models.item().db('items').select('content').where('id', '=', itemId).first();

		// Calling code should only call this handler if the row exists, so if
		// we find it doesn't, it's an error.
		if (!row) throw new Error(`No such row: ${itemId}`);

		return row.content;
	}

	public async delete(_itemId: string | string[], _context: Context): Promise<void> {
		// noop because the calling code deletes the whole row, including the
		// content.
	}

	public async exists(itemId: string, context: Context): Promise<boolean> {
		const row = await context.models.item().db('items').select('content').where('id', '=', itemId).first();
		return !!row && !!row.content;
	}

}
