import { IdGenerator } from '../../domain/services/id-generator.js';
import {
  FixedStrategy,
  PercentageStrategy,
  RewardPointsCalculator,
} from '../../domain/services/reward-points-calculator.js';
import { RewardRepository } from '../../domain/repositories/reward-repository.js';
import { PersonRepository } from '../../domain/repositories/person-repository.js';
import { PointsRepository } from '../../domain/repositories/points-repository.js';
import { Database } from '../../infrastructure/database/database.js';
import { SqliteDatabase } from '../../infrastructure/database/sqlite.database.js';
import { SqliteRewardRepository } from '../../infrastructure/repositories/sqlite-reward-repository.js';
import { SqlitePersonRepository } from '../../infrastructure/repositories/sqlite-person-repository.js';
import { SqlitePointsRepository } from '../../infrastructure/repositories/sqlite-points-repository.js';
import { UuidIdGenerator } from '../../infrastructure/id/uuid-id-generator.js';
import { ScryptPasswordHasher } from '../../infrastructure/security/scrypt-password-hasher.js';
import { PasswordHasher } from '../../domain/services/password-hasher.js';
import { CreateRewardUseCase } from '../use-cases/create-reward.use-case.js';
import { ListRewardsUseCase } from '../use-cases/list-rewards.use-case.js';
import { GetRewardUseCase } from '../use-cases/get-reward.use-case.js';
import { RemoveRewardUseCase } from '../use-cases/remove-reward.use-case.js';
import { CalculatePointsUseCase } from '../use-cases/calculate-points.use-case.js';
import { CreatePersonUseCase } from '../use-cases/create-person.use-case.js';
import { LoginPersonUseCase } from '../use-cases/login-person.use-case.js';
import { UpdatePersonUseCase } from '../use-cases/update-person.use-case.js';
import { GetPersonUseCase } from '../use-cases/get-person.use-case.js';
import { ListPersonsUseCase } from '../use-cases/list-persons.use-case.js';
import { RemovePersonUseCase } from '../use-cases/remove-person.use-case.js';
import { AddPointsUseCase } from '../use-cases/add-points.use-case.js';
import { ListPointsEntriesUseCase } from '../use-cases/list-points-entries.use-case.js';
import { RemovePointsUseCase } from '../use-cases/remove-points.use-case.js';
import { RedeemPointsUseCase } from '../use-cases/redeem-points.use-case.js';

export interface Container {
  database: Database;
  rewardRepository: RewardRepository;
  personRepository: PersonRepository;
  pointsRepository: PointsRepository;
  idGenerator: IdGenerator;
  passwordHasher: PasswordHasher;
  rewardPointsCalculator: RewardPointsCalculator;
  createReward: CreateRewardUseCase;
  listRewards: ListRewardsUseCase;
  getReward: GetRewardUseCase;
  removeReward: RemoveRewardUseCase;
  calculatePoints: CalculatePointsUseCase;
  createPerson: CreatePersonUseCase;
  updatePerson: UpdatePersonUseCase;
  loginPerson: LoginPersonUseCase;
  getPerson: GetPersonUseCase;
  listPersons: ListPersonsUseCase;
  removePerson: RemovePersonUseCase;
  addPoints: AddPointsUseCase;
  listPointsEntries: ListPointsEntriesUseCase;
  removePoints: RemovePointsUseCase;
  redeemPoints: RedeemPointsUseCase;
}

const database = new SqliteDatabase(process.env.DATABASE_URL ?? ':memory:');
const rewardRepository = new SqliteRewardRepository(database);
const personRepository = new SqlitePersonRepository(database);
const pointsRepository = new SqlitePointsRepository(database);
const idGenerator = new UuidIdGenerator();
const passwordHasher = new ScryptPasswordHasher();
const rewardPointsCalculator = new RewardPointsCalculator([
  new PercentageStrategy(),
  new FixedStrategy(),
]);

export const container: Container = {
  database,
  rewardRepository,
  personRepository,
  pointsRepository,
  idGenerator,
  passwordHasher,
  rewardPointsCalculator,
  createReward: new CreateRewardUseCase(rewardRepository, idGenerator),
  listRewards: new ListRewardsUseCase(rewardRepository),
  getReward: new GetRewardUseCase(rewardRepository),
  removeReward: new RemoveRewardUseCase(rewardRepository),
  calculatePoints: new CalculatePointsUseCase(rewardRepository, rewardPointsCalculator),
  createPerson: new CreatePersonUseCase(personRepository, idGenerator, passwordHasher),
  updatePerson: new UpdatePersonUseCase(personRepository, passwordHasher),
  loginPerson: new LoginPersonUseCase(personRepository, passwordHasher),
  getPerson: new GetPersonUseCase(personRepository),
  listPersons: new ListPersonsUseCase(personRepository),
  removePerson: new RemovePersonUseCase(personRepository, pointsRepository),
  addPoints: new AddPointsUseCase(personRepository, pointsRepository, idGenerator),
  listPointsEntries: new ListPointsEntriesUseCase(personRepository, pointsRepository),
  removePoints: new RemovePointsUseCase(personRepository, pointsRepository, idGenerator),
  redeemPoints: new RedeemPointsUseCase(personRepository, pointsRepository, idGenerator),
};