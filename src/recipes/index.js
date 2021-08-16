const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
const dynamodb = new AWS.DynamoDB();

function getRecipesByCuisine(cuisine) {
    return new Promise((resolve, reject) => {

        var param = {
            ExpressionAttributeValues: {
                ':c': cuisine,
            },
            KeyConditionExpression: 'cuisine = :c',
            TableName: 'Recipes',
            IndexName: 'cuisine-index'
        };

        console.log("cuisine ", cuisine)   
        docClient.query(param).promise().then(items => {
            console.log("Items ", items);
            resolve(items);
          }).catch(err => {
            console.log(err);
            reject(err);
          });
        
        });

};

function scanTable() {
    return new Promise((resolve, reject) => {
      
        const params = {
          TableName: 'Recipes',
        };
        const scanResults = [];
        
        docClient.scan(params).promise().then(items => {
            items.Items.forEach((item) => scanResults.push(item));
            resolve(scanResults);
          }).catch(err => {
            console.log(err);
            reject(err);
          });
        
        });
};

function getRecipe(recipeId){
    return new Promise((resolve, reject) => {
        
        var params = {
            TableName: 'Recipes',
            Key: {
              'RecipeId': {S: recipeId.toString()}
            },
          };

        dynamodb.getItem(params).promise().then(item => {
            console.log("Items ", item);
            resolve(item);
          }).catch(err => {
            console.log(err);
            reject(err);
          });
    });
}

function getRecipeInformation(recipeId){

    return new Promise((resolve, reject) => {
        var param = {
            ExpressionAttributeValues: {
                ':i': recipeId,
            },
            KeyConditionExpression: 'id = :i',
            TableName: 'Foodsta-recipeInformation',
        };

        docClient.query(param).promise().then(items => {
            console.log("Items ", items);
            resolve(items);
        }).catch(err => {
            console.log(err);
            reject(err);
        });  
    });
}


exports.handler = async (event, context) => {
    console.log(event)
    console.log(context)

    let res;
    switch(event.resource){
        case '/recipes/cuisine/{cuisine}':
            res = await getRecipesByCuisine(event.pathParameters.cuisine);
            break;
        case '/recipes/getAll':
            res = await scanTable();
            break;
        case '/recipes/cuisine/{recipeId}':
            res = await getRecipe(event.pathParameters.recipeId);
            break;
        case "/recipes/{recipeId}/information":
            res = await getRecipeInformation(event.pathParameters.recipeId);
            break;
        default:
            res = null
    }
    
    return {
        "statusCode": 200,
        "body": JSON.stringify(res),
        "headers": {},
        "isBase64Encoded": false
    };
};