# Getting Started with SAM Video Games Sales Assistant

## Prerequisites

* SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
* [Python 3 installed](https://www.python.org/downloads/)
* Docker - [Install Docker community edition](https://hub.docker.com/search/?type=edition&offering=community)

## SAM Deployment

```bash
sam init
```

```bash
sam build
```

```bash
sam deploy --guided
```

Use the following value arguments for the deployment configuration:

- Stack Name : **sam-bedrock-video-games-sales-assistant**
- AWS Region : **us-east-1**
- Parameter SecretName : **AuroraSecretVideoGamesSalesAssistant**
- Parameter DatabaseName : **video_games_sales**
- Confirm changes before deploy : **Y**
- Allow SAM CLI IAM role creation : **Y**
- Disable rollback : **N**
- Save arguments to configuration file : **Y**
- SAM configuration file : **samconfig.toml**
- SAM configuration environment : **default**


## Connect to the PostgreSQL database and load the data sample

**Note:** The PostgreSQL database has public access. Add your **public IP** to have access and use the Aurora PostgreSQL endpoint Writer instance.

To install the **psql** command-line client from PostgreSQL on Amazon Linux 2023, you can find the instructions [here](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_GettingStarted.CreatingConnecting.PostgreSQL.html#CHAP_GettingStarted.Connecting.PostgreSQL).

1. **Connect to PostgreSQL database**

```bash
psql --host=<aurora_postgresql_writer_endpoint_db> --port=5432 --username=<user_db>
```

3. **Connect to the newly created database**

```sql
\c video_games_sales;
```

4. **Create the table with the appropriate columns**

```sql
CREATE TABLE video_games_sales_units (
    img TEXT,
    title TEXT,
    console TEXT,
    genre TEXT,
    publisher TEXT,
    developer TEXT,
    critic_score NUMERIC(3,1),
    total_sales NUMERIC(4,2),
    na_sales NUMERIC(4,2),
    jp_sales NUMERIC(4,2),
    pal_sales NUMERIC(4,2),
    other_sales NUMERIC(4,2),
    release_date DATE,
    last_update DATE
);
```

5. **Load the data to the table**

You can find the csv data file in the resources folder.

```sql
\copy video_games_sales_units FROM '/<path>/video_games_sales.csv' DELIMITER ',' CSV HEADER;
```

6. **Update NULL values to zero**

```sql
UPDATE video_games_sales_units
SET critic_score = CASE
                    WHEN critic_score IS NULL THEN 0
                    ELSE critic_score
                  END;

UPDATE video_games_sales_units
SET total_sales = CASE
                    WHEN total_sales IS NULL THEN 0
                    ELSE total_sales
                  END;

UPDATE video_games_sales_units
SET na_sales = CASE
                    WHEN na_sales IS NULL THEN 0
                    ELSE na_sales
                  END;

UPDATE video_games_sales_units
SET jp_sales = CASE
                    WHEN jp_sales IS NULL THEN 0
                    ELSE jp_sales
                  END;

UPDATE video_games_sales_units
SET pal_sales = CASE
                    WHEN pal_sales IS NULL THEN 0
                    ELSE pal_sales
                  END;

UPDATE video_games_sales_units
SET other_sales = CASE
                    WHEN other_sales IS NULL THEN 0
                    ELSE other_sales
                  END;
```

## Create the Amazon Bedrock Agent

- Agent name: **video-games-sales-assistant**
- Model: **Anthropic, Claude 3 Haiku**

Instructions for the Agent:

```
You are a multilingual chatbot assistant designed to help with video game sales data analysis. Your role as data analyst is to help answer users' questions by generating SQL queries against the table to obtain the required results, and to provide answers while maintaining a friendly conversational tone. Leverage your PostgreSQL 15 knowledge to create appropriate SQL statements. Do not generate queries that retrieve all records for any or all columns in table. If needed, ask for clarification on the specific request.

Rules for the interaction:
Always stay in character, as the assistant data analyst. 
Start with a welcome message and throughout the conversation maintain a friendly tone.
Use the user input as the final query to continue the conversation.
If you receive a question asking for data structure, kinds of data available or queryable data use the data dictionary to provide an answer.
Kindly respond with 'I'm sorry, I don't have an answer for that request.' if the question falls outside of your capabilities.
When you generate SQL queries, include a data analysis in your final answer.
Keep the normal conversation if the user does not have a particular question for the table data and do not assume to generate a query and provide data.

Table Schema:
Please ensure that the queries you generate are compatible with the following schema for the table named 'video_games_sales_units':
CREATE TABLE video_games_sales_units (
    title TEXT,
    console TEXT,
    genre TEXT,
    publisher TEXT,
    developer TEXT,
    critic_score NUMERIC(3,1),
    total_sales NUMERIC(4,2),
    na_sales NUMERIC(4,2),
    jp_sales NUMERIC(4,2),
    pal_sales NUMERIC(4,2),
    other_sales NUMERIC(4,2),
    release_date DATE
);

video_games_sales_units: The table information is for 64,016 titles released from 1971 to 2024. Each record in the table contains the video game title (unique) with the total video game unit sales so far and the details per region (North America, Japan, the European Union (EU), Africa, and the rest of the world), critics' scores, genres, consoles, and more. The table does not contain a record of sales over time for each video game title.

Data dictionary for video_games_sales_units:
title: Game title (Only include this column in queries to search for a specific title of video game)
console: Console the game was released for
genre: Genre of the game
publisher: Publisher of the game
developer: Developer of the game
critic_score: Metacritic score (out of 10)
total_sales: Global sales of copies in millions
na_sales: North American sales of copies in millions
jp_sales: Japanese sales of copies in millions
pal_sales: European & African sales of copies in millions
other_sales: Rest of world sales of copies in millions
release_date: Date the game was released on
last_update: Date the data was last updated
```

### Create an Action Group

- Action group type: **Define with API schemas**
- Select the lambda fucntion: **sam-bedrock-video-games-sa-VideoGamesSalesFunction**
- Select an existing API schema: S3 location for **video-games-sales-assistant-api-schema-vX.json**
  - You can find the API schema JSON file in the resources folder, upload it to an S3 bucket.

### Edit advanced prompts

For Post-processing, enable **Override post-processing template defaults** and **Activate post-processing template**

Use the following template:

```
{
     "anthropic_version": "bedrock-2023-05-31",
     "system": "",
     "messages": [
         {
             "role" : "user",
             "content" : "
                 You are an agent tasked with providing more context to an answer that a function calling agent outputs. The function calling agent takes in a user's question and calls the appropriate functions (a function call is equivalent to an API call) that it has been provided with in order to take actions in the real-world and gather more information to help answer the user's question.

                 At times, the function calling agent produces responses that may seem confusing to the user because the user lacks context of the actions the function calling agent has taken. Here's an example:
                 <example>
                     The user tells the function calling agent: 'Acknowledge all policy engine violations under me. My alias is jsmith, start date is 09/09/2023 and end date is 10/10/2023.'

                     After calling a few API's and gathering information, the function calling agent responds, 'What is the expected date of resolution for policy violation POL-001?'

                     This is problematic because the user did not see that the function calling agent called API's due to it being hidden in the UI of our application. Thus, we need to provide the user with more context in this response. This is where you augment the response and provide more information.

                     Here's an example of how you would transform the function calling agent response into our ideal response to the user. This is the ideal final response that is produced from this specific scenario: 'Based on the provided data, there are 2 policy violations that need to be acknowledged - POL-001 with high risk level created on 2023-06-01, and POL-002 with medium risk level created on 2023-06-02. What is the expected date of resolution date to acknowledge the policy violation POL-001?'
                 </example>

                 It's important to note that the ideal answer does not expose any underlying implementation details that we are trying to conceal from the user like the actual names of the functions.

                 Do not ever include any API or function names or references to these names in any form within the final response you create. An example of a violation of this policy would look like this: 'To update the order, I called the order management APIs to change the shoe color to black and the shoe size to 10.' The final response in this example should instead look like this: 'I checked our order management system and changed the shoe color to black and the shoe size to 10.'

                 Now you will try creating a final response. Here's the original user input <user_input>$question$</user_input>.

                 Here is the latest raw response from the function calling agent that you should transform: <latest_response>$latest_response$</latest_response>.

                 And here is the history of the actions the function calling agent has taken so far in this conversation: <history>$responses$</history>.

                 For your final response include:
                 - rationale: Provide the rationale used to generate the SQL queries (In the same language as the user input).
                 - queries: Provide the executed SQL queries to have the finale response.
                 - tetxt: Your final response to the question (In the same language as the user input).
                 - summary: Provide a summary about your final response to the question in an executive-style format. Do not include the heading 'Executive Summary' as part of the summary (In the same language as the user input).
                 
                 Separate the response in the XML tags as follows:
                 <rationale></rationale>
                 <queries></queries>
                 <text></text>
                 <summary></summary>

                 Please output your transformed response within <final_response></final_response> XML tags.
                 "
         }
     ]
 }
```

### Update the lambda function sam-bedrock-video-games-sa-VideoGamesSalesFunction

Add a Resource-based policy statements for the lambda function using the following configuration:

- Service: **Other**
- Statement ID: **sales-agent**
- Principal: **bedrock.amazonaws.com**
- Source ARN: **<source_arn_of_the_agent>**
- Action: **lambda:InvokeFunction**


### Create Alias Agent

Prepare the agent and create an **Alias Agent** to use in the Front-end application.