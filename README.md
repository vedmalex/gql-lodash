# graphql-schema-builder

Is fast and lean way to build graphql-schema from compositions of components

npm i graphql-schema-builder

#TODO

this is not working with lodash somehow

query q1{
  getAppUsers{
  	users{
      displayName
      email
      uid
    }
  }
}

mutation login{
  login(username:"edu.rostov108@gmail.com",password:"01091896swami"){
    token
    refreshToken
  }
}

mutation refreshToken{
  refreshToken(token:"AEu4IL0iIZiEDiyjJ3mdIOrMzAx-j1qFywliE_TGbLG60GCt3crM0ReLpJd7sV-zaPxkdJ2WOYpIlZu8zN06Zo_zrX4hxIAeD1YJZo4geqf0YdzLGsBgj3rF7I7Kaq6Blb12HDkp9vtRcCiLB237V4LfFwnzQABDt72uEwPB14uoBYXE-z2W7JBZPJVQZ9gWELMD0QTBIv9tBQC4HHseHrx5OWvLHSk1_HyPZe3aTFh-LsNHgCfnipVHdJiSvsKqNyfyLTkG7tVeyuQTHzS1SlWuz6ZFo1Diy_UudOqd1EJUT0cuYQteF2E"){
    uid
  }
}