import {
  Args,
  Mutation,
  Query,
  Resolver,
  Parent,
  ResolveField
} from '@nestjs/graphql';
import { UseFilters, UseGuards } from '@nestjs/common';
import {
  Entity,
  EntityField,
  EntityVersion,
  EntityPermission,
  EntityPermissionField,
  User
} from 'src/models';
import { FindOneArgs } from 'src/dto';
import { AuthorizeContext } from 'src/decorators/authorizeContext.decorator';
import { InjectContextValue } from 'src/decorators/injectContextValue.decorator';
import { EnumDataType } from 'src/enums/EnumDataType';
import { DataConflictError } from 'src/errors/DataConflictError';
import { UserEntity } from 'src/decorators/user.decorator';
import { AuthorizableResourceParameter } from 'src/enums/AuthorizableResourceParameter';
import { InjectableResourceParameter } from 'src/enums/InjectableResourceParameter';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { GqlResolverExceptionsFilter } from 'src/filters/GqlResolverExceptions.filter';
import { UserService } from '../user/user.service';
import {
  CreateOneEntityArgs,
  FindManyEntityArgs,
  UpdateOneEntityArgs,
  FindOneEntityArgs,
  FindManyEntityVersionArgs,
  DeleteOneEntityArgs,
  UpdateEntityPermissionArgs,
  LockEntityArgs,
  FindManyEntityFieldArgs,
  UpdateEntityPermissionRolesArgs,
  UpdateEntityPermissionFieldRolesArgs,
  AddEntityPermissionFieldArgs,
  DeleteEntityPermissionFieldArgs,
  CreateOneEntityFieldArgs,
  CreateOneEntityFieldByDisplayNameArgs,
  UpdateOneEntityFieldArgs
} from './dto';
import { EntityService } from './entity.service';

const RELATED_FIELD_ID_DEFINED_NAMES_SHOULD_BE_UNDEFINED_ERROR_MESSAGE =
  'When data.dataType is Lookup and data.properties.relatedFieldId is defined, relatedFieldName and relatedFieldDisplayName must be null';
const RELATED_FIELD_ID_UNDEFINED_AND_NAMES_UNDEFINED_ERROR_MESSAGE =
  'When data.dataType is Lookup, either data.properties.relatedFieldId must be defined or relatedFieldName and relatedFieldDisplayName must not be null and not be empty';
const RELATED_FIELD_NAMES_SHOULD_BE_UNDEFINED_ERROR_MESSAGE =
  'When data.dataType is not Lookup, relatedFieldName and relatedFieldDisplayName must be null';

@Resolver(() => Entity)
@UseFilters(GqlResolverExceptionsFilter)
@UseGuards(GqlAuthGuard)
export class EntityResolver {
  constructor(
    private readonly entityService: EntityService,
    private readonly userService: UserService
  ) {}

  @Query(() => Entity, {
    nullable: true
  })
  @AuthorizeContext(AuthorizableResourceParameter.EntityId, 'where.id')
  async entity(@Args() args: FindOneEntityArgs): Promise<Entity | null> {
    return this.entityService.entity(args);
  }

  @Query(() => [Entity], {
    nullable: false
  })
  @AuthorizeContext(AuthorizableResourceParameter.AppId, 'where.app.id')
  async entities(@Args() args: FindManyEntityArgs): Promise<Entity[]> {
    return this.entityService.entities(args);
  }

  @Mutation(() => Entity, {
    nullable: false
  })
  @AuthorizeContext(AuthorizableResourceParameter.AppId, 'data.app.connect.id')
  async createOneEntity(
    @UserEntity() user: User,
    @Args() args: CreateOneEntityArgs
  ): Promise<Entity> {
    return this.entityService.createOneEntity(args, user);
  }

  @Mutation(() => Entity, {
    nullable: true
  })
  @AuthorizeContext(AuthorizableResourceParameter.EntityId, 'where.id')
  async deleteEntity(
    @UserEntity() user: User,
    @Args() args: DeleteOneEntityArgs
  ): Promise<Entity | null> {
    return this.entityService.deleteOneEntity(args, user);
  }

  @Mutation(() => Entity, {
    nullable: true
  })
  @AuthorizeContext(AuthorizableResourceParameter.EntityId, 'where.id')
  async updateEntity(
    @UserEntity() user: User,
    @Args() args: UpdateOneEntityArgs
  ): Promise<Entity | null> {
    return this.entityService.updateOneEntity(args, user);
  }

  @Mutation(() => Entity, {
    nullable: true
  })
  @AuthorizeContext(AuthorizableResourceParameter.EntityId, 'where.id')
  @InjectContextValue(InjectableResourceParameter.UserId, 'userId')
  async lockEntity(
    @UserEntity() user: User,
    @Args() args: LockEntityArgs
  ): Promise<Entity | null> {
    return this.entityService.acquireLock(args, user);
  }

  @ResolveField(() => [EntityField])
  async fields(
    @Parent() entity: Entity,
    @Args() args: FindManyEntityFieldArgs
  ) {
    if (entity.fields && entity.fields.length) {
      return entity.fields;
    }
    //the fields property on the Entity always returns the fields of the current version (versionNumber=0)
    return this.entityService.getFields(entity.id, args);
  }

  @ResolveField(() => [EntityPermission])
  async permissions(@Parent() entity: Entity) {
    //the fields property on the Entity always returns the fields of the current version (versionNumber=0)
    return this.entityService.getPermissions(entity.id);
  }

  @ResolveField(() => [EntityVersion])
  async versions(
    @Parent() entity: Entity,
    @Args() args: FindManyEntityVersionArgs
  ) {
    return this.entityService.getVersions({
      ...args,
      where: {
        ...args.where,
        entity: { id: entity.id }
      }
    });
  }

  @ResolveField(() => [User])
  async lockedByUser(@Parent() entity: Entity) {
    if (entity.lockedByUserId) {
      return this.userService.findUser({
        where: {
          id: entity.lockedByUserId
        }
      });
    } else {
      return null;
    }
  }

  @Mutation(() => EntityPermission, { nullable: false })
  @AuthorizeContext(AuthorizableResourceParameter.EntityId, 'where.id')
  async updateEntityPermission(
    @UserEntity() user: User,
    @Args() args: UpdateEntityPermissionArgs
  ): Promise<EntityPermission> {
    return this.entityService.updateEntityPermission(args, user);
  }

  @Mutation(() => EntityPermission, { nullable: false })
  @AuthorizeContext(
    AuthorizableResourceParameter.EntityId,
    'data.entity.connect.id'
  )
  async updateEntityPermissionRoles(
    @UserEntity() user: User,
    @Args() args: UpdateEntityPermissionRolesArgs
  ): Promise<EntityPermission> {
    return this.entityService.updateEntityPermissionRoles(args, user);
  }

  @Mutation(() => EntityPermissionField, { nullable: false })
  @AuthorizeContext(
    AuthorizableResourceParameter.EntityId,
    'data.entity.connect.id'
  )
  async addEntityPermissionField(
    @UserEntity() user: User,
    @Args() args: AddEntityPermissionFieldArgs
  ): Promise<EntityPermissionField> {
    return this.entityService.addEntityPermissionField(args, user);
  }

  @Mutation(() => EntityPermissionField, { nullable: false })
  @AuthorizeContext(AuthorizableResourceParameter.EntityId, 'where.entityId')
  async deleteEntityPermissionField(
    @UserEntity() user: User,
    @Args() args: DeleteEntityPermissionFieldArgs
  ): Promise<EntityPermissionField> {
    return this.entityService.deleteEntityPermissionField(args, user);
  }

  @Mutation(() => EntityPermissionField, { nullable: false })
  @AuthorizeContext(
    AuthorizableResourceParameter.EntityPermissionFieldId,
    'data.permissionField.connect.id'
  )
  async updateEntityPermissionFieldRoles(
    @UserEntity() user: User,
    @Args() args: UpdateEntityPermissionFieldRolesArgs
  ): Promise<EntityPermissionField> {
    return this.entityService.updateEntityPermissionFieldRoles(args, user);
  }

  @Mutation(() => EntityField, { nullable: false })
  @AuthorizeContext(
    AuthorizableResourceParameter.EntityId,
    'data.entity.connect.id'
  )
  async createEntityField(
    @UserEntity() user: User,
    @Args() args: CreateOneEntityFieldArgs
  ): Promise<EntityField> {
    this.validateFieldMutationArgs(args);
    return this.entityService.createField(args, user);
  }

  @Mutation(() => EntityField, { nullable: false })
  @AuthorizeContext(
    AuthorizableResourceParameter.EntityId,
    'data.entity.connect.id'
  )
  async createEntityFieldByDisplayName(
    @UserEntity() user: User,
    @Args() args: CreateOneEntityFieldByDisplayNameArgs
  ): Promise<EntityField> {
    return this.entityService.createFieldByDisplayName(args, user);
  }

  @Mutation(() => EntityField, { nullable: false })
  @AuthorizeContext(AuthorizableResourceParameter.EntityFieldId, 'where.id')
  async deleteEntityField(
    @UserEntity() user: User,
    @Args() args: FindOneArgs
  ): Promise<EntityField | null> {
    return this.entityService.deleteField(args, user);
  }

  @Mutation(() => EntityField, { nullable: false })
  @AuthorizeContext(AuthorizableResourceParameter.EntityFieldId, 'where.id')
  async updateEntityField(
    @UserEntity() user: User,
    @Args() args: UpdateOneEntityFieldArgs
  ): Promise<EntityField | null> {
    this.validateFieldMutationArgs(args);
    return this.entityService.updateField(args, user);
  }

  private validateFieldMutationArgs(
    args: CreateOneEntityFieldArgs | UpdateOneEntityFieldArgs
  ): void {
    const { data, relatedFieldName, relatedFieldDisplayName } = args;
    if (data.dataType === EnumDataType.Lookup) {
      const { relatedFieldId } = data.properties;
      RELATED_FIELD_NAMES_SHOULD_BE_UNDEFINED_ERROR_MESSAGE;
      if (!relatedFieldId && (!relatedFieldName || !relatedFieldDisplayName)) {
        throw new DataConflictError(
          RELATED_FIELD_ID_UNDEFINED_AND_NAMES_UNDEFINED_ERROR_MESSAGE
        );
      }
      if (relatedFieldId && (relatedFieldName || relatedFieldDisplayName)) {
        throw new DataConflictError(
          RELATED_FIELD_ID_DEFINED_NAMES_SHOULD_BE_UNDEFINED_ERROR_MESSAGE
        );
      }
    } else {
      if (relatedFieldName || relatedFieldDisplayName) {
        throw new DataConflictError(
          RELATED_FIELD_NAMES_SHOULD_BE_UNDEFINED_ERROR_MESSAGE
        );
      }
    }
  }
}
