import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import { createPostBodySchema, changePostBodySchema } from './schema';
import type { PostEntity } from '../../utils/DB/entities/DBPosts';
import { validateUuid } from '../../utils/validation';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<PostEntity[]> {
    return fastify.db.posts.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<PostEntity> {
      const { id } = request.params;

      const post = await fastify.db.posts.findOne({
        key: 'id',
        equals: id,
      });

      if (post) {
        return post;
      } else {
        throw fastify.httpErrors.notFound('Post not found');
      }
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createPostBodySchema,
      },
    },
    async function (request, reply): Promise<PostEntity> {
      const { userId } = request.body;

      if (!validateUuid(userId)) {
        throw fastify.httpErrors.badRequest('Request data invalid');
      }

      const user = await fastify.db.users.findOne({
        key: 'id',
        equals: userId,
      });

      if (!user) {
        throw fastify.httpErrors.badRequest(`User with id=${userId} not found`);
      }

      const createdPost = await fastify.db.posts.create(request.body);
      return createdPost;
    }
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<PostEntity> {
      const { id } = request.params;

      if (!validateUuid(id)) {
        throw fastify.httpErrors.badRequest('Post id invalid');
      }

      try {
        const deletedPost = await fastify.db.posts.delete(id);
        return deletedPost;
      } catch (error) {
        throw fastify.httpErrors.notFound('Post not found');
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changePostBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<PostEntity> {
      const { id } = request.params;

      if (!validateUuid(id)) {
        throw fastify.httpErrors.badRequest('Post id invalid');
      }

      try {
        const updatedPost = await fastify.db.posts.change(id, request.body);
        return updatedPost;
      } catch (error) {
        throw fastify.httpErrors.notFound();
      }
    }
  );
};

export default plugin;
