## Serverless REST Assignment - Distributed Systems.

__Name:__ ....Peter Woods .....

__Demo:__ ... [link to your YouTube video demonstration](https://www.youtube.com/watch?v=TfNPQMCY90w) ......

### Context.

A serverless REST API for managing Football Teams and their Players.The application allows CRUD operations on teams, querying and filtering players, and includes additional features like translation of team history, API key authorization, and more.

Context: Football Teams

Team Table item attributes:
+ id - number  (Partition key)
+ teamName - string  
+ country - string
+ history - string
+ league - string
+ location - string
+ founded - number
+ stadium - string
+ titlesWon - number
+ isActive - boolean

Player Table item attributes:
+ teamId - string  (Partition key)
+ playerId - string  (Sort Key)
+ name - string
+ position - string
+ nationality - string
+ age - number
+ isCaptain - boolean

### App API endpoints.
 

+ POST /teams - Create a new team
+ GET /teams - Get a list of all teams
+ GET /teams/{teamId} - Get a specific team by teamId
+ PUT /teams/{teamId} - Update a specific team by teamId
+ GET /teams/{teamId}?players=true - Get list of players for a team 
+ GET /players?teamId=2&position=Forward&isCaptain=true to filter players.
+ GET /teams/{teamId}/translate?language=fr - Get the team description translated to a specific language (with caching)



### Features.

#### Translation persistence 

Translated team histories are cached in DynamoDb table (translationsCacheTable). Before translation system checked the cache for existing translations. If history has changed cache is invalidated and retranslated

+ teamId - String (partition key)
+ translatedHistory - String 
+ targetLanguage - String 
+ cached - boolean
 

#### Custom L2 Construct 

Custom CDK construct was created for lambda and API gateway integration.
+ Lambdas functions
+ API gateway 
+ IAM permissions
+ Enviroment variables

Construct Input props object:
~~~
ApiConstructorProps {
  api: apig.RestApi;
  path: string;
  method: string;
  table: dynamodb.Table;
  lambdaEntry: string;
  apiKeyRequired?: boolean;
  readWriteAccess?: boolean;
  additionalEnv?: { [key: string]: string };
  attachTranslatePolicy?: boolean;
}
~~~
Construct public properties
~~~
export class ApiConstructor extends Construct {
  public readonly lambdaFn: lambdanode.NodejsFunction;
~~~
 ]

#### Multi-Stack app 

The project is split into two stacks
+ DatabaseStack : DynamoDb tables (Teams, Players, Translations Cache)
+ ApiStack : API Gateway, Lambdas functions, API keys and usage plans. This needs to be run to access outside of AWS console

#### API Keys. 

+ POST and PUT endpoints require API keys for access
+ API gateway has usage plan

~~~ts
const apiKey = new apig.ApiKey(this, 'TeamsAPIKey', {
      apiKeyName: 'Teams-API-Key',
    });

    const usagePlan = new apig.UsagePlan(this, 'TeamsAPIUsagePlan', {
      name: 'Teams Management API Usage Plan',
      apiStages: [{ api, stage: api.deploymentStage }],
    });
    
    // Teams POST
    new ApiConstructor(this, 'CreateTeam', {
      api,
      path: 'teams',
      method: 'POST',
      table: props.databaseStack.teamsTable,
      lambdaEntry: `${__dirname}/../../lambdas/createTeam.ts`,
      apiKeyRequired: true,
      readWriteAccess: true,
    });
~~~

