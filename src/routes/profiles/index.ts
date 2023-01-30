import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import { createProfileBodySchema, changeProfileBodySchema } from './schema';
import type { ProfileEntity } from '../../utils/DB/entities/DBProfiles';
import { validateUuid } from '../../utils/validation';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<ProfileEntity[]> {
    return fastify.db.profiles.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const profile = await fastify.db.profiles.findOne({
        key: 'id',
        equals: request.params.id,
      });
      if (!profile) {
        throw fastify.httpErrors.notFound('Profile entity not found');
      }
      return profile;
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createProfileBodySchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const { userId, memberTypeId } = request.body;

      const user = await fastify.db.users.findOne({
        key: 'id',
        equals: userId,
      });

      if (!user) {
        throw fastify.httpErrors.badRequest('Used not found');
      }

      const existingProfile = await fastify.db.profiles.findOne({
        key: 'userId',
        equals: userId,
      });

      if (existingProfile) {
        throw fastify.httpErrors.badRequest(
          `Profile for user with id=${userId} already exists`
        );
      }

      const memberType = await fastify.db.memberTypes.findOne({
        key: 'id',
        equals: memberTypeId,
      });

      if (!memberType) {
        throw fastify.httpErrors.badRequest(
          `MemberType with id=${memberTypeId} not found`
        );
      }

      const createdProfile = await fastify.db.profiles.create(request.body);

      return createdProfile;
    }
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const { id } = request.params;

      if (!validateUuid(id)) {
        throw fastify.httpErrors.badRequest('Id invalid');
      }

      try {
        const deletedProfile = await fastify.db.profiles.delete(id);
        return deletedProfile;
      } catch (error) {
        throw fastify.httpErrors.notFound(`Profile with id=${id} not found`);
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeProfileBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const { id } = request.params;

      if (!validateUuid(id)) {
        throw fastify.httpErrors.badRequest('Id invalid');
      }

      try {
        const updatedProfile = await fastify.db.profiles.change(
          id,
          request.body
        );
        return updatedProfile;
      } catch (error) {
        throw fastify.httpErrors.notFound(`Profile with id=${id} not found`);
      }
    }
  );
};

export default plugin;
