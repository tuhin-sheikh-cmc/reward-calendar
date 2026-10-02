import { Person, PersonProperties, PersonRole } from '../../domain/entities/person.js';
import { PersonRepository } from '../../domain/repositories/person-repository.js';
import { Database } from '../database/database.js';

interface PersonRow {
  id: string;
  name: string;
  role: string;
  email: string | null;
  password_hash: string | null;
  is_active: number;
  points_balance: number;
  created_at: string;
  updated_at: string;
}

const PERSON_COLUMNS =
  'id, name, role, email, password_hash, is_active, points_balance, created_at, updated_at';

function mapRow(row: PersonRow | null): Person | null {
  if (!row) {
    return null;
  }
  const snapshot: PersonProperties = {
    id: row.id,
    name: row.name,
    role: row.role as PersonRole,
    email: row.email ?? '',
    passwordHash: row.password_hash ?? '',
    isActive: row.is_active === 1,
    pointsBalance: row.points_balance,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
  return Person.fromSnapshot(snapshot);
}

export class SqlitePersonRepository implements PersonRepository {
  constructor(private readonly db: Database) {}

  public async save(person: Person): Promise<void> {
    await this.db.run(
      `INSERT INTO persons (id, name, role, email, password_hash, is_active, points_balance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         role = excluded.role,
         email = excluded.email,
         password_hash = excluded.password_hash,
         is_active = excluded.is_active,
         points_balance = excluded.points_balance,
         updated_at = excluded.updated_at`,
      [
        person.id,
        person.name,
        person.role,
        person.email,
        person.passwordHash,
        person.isActive ? 1 : 0,
        person.pointsBalance,
        person.createdAt.toISOString(),
        person.updatedAt.toISOString(),
      ],
    );
  }

  public async findById(id: string): Promise<Person | null> {
    const row = await this.db.queryOne<PersonRow>(
      `SELECT ${PERSON_COLUMNS} FROM persons WHERE id = ?`,
      [id],
    );
    return mapRow(row);
  }

  public async findByEmail(email: string): Promise<Person | null> {
    const row = await this.db.queryOne<PersonRow>(
      `SELECT ${PERSON_COLUMNS} FROM persons WHERE email = ?`,
      [email],
    );
    return mapRow(row);
  }

  public async findAll(): Promise<Person[]> {
    const rows = await this.db.query<PersonRow>(
      `SELECT ${PERSON_COLUMNS} FROM persons ORDER BY created_at ASC, id ASC`,
    );
    return rows.map((row) => mapRow(row) as Person);
  }

  public async remove(id: string): Promise<void> {
    await this.db.run('DELETE FROM persons WHERE id = ?', [id]);
  }

  public async clear(): Promise<void> {
    await this.db.run('DELETE FROM persons');
  }
}
