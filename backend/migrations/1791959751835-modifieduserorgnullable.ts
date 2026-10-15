import { MigrationInterface, QueryRunner } from "typeorm";

export class Modifieduserorgnullable1791959751835 implements MigrationInterface {
  name = "Modifieduserorgnullable1791959751835";

<<<<<<< HEAD
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "organization_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "organization_id" SET NOT NULL`,
    );
  }
=======
  public async up(_queryRunner: QueryRunner): Promise<void> {}

  public async down(_queryRunner: QueryRunner): Promise<void> {}
>>>>>>> origin/develop
}
