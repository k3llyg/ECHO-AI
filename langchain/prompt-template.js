import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

// Import environment variables
import * as dotenv from "dotenv";
dotenv.config();

// Instantiate the model
const model = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0.9,
});


// Create Prompt Template from fromMessages
// const prompt = ChatPromptTemplate.fromTemplate('Tell a joke about {word}');
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a comedian.  Tell a joke about {word} in 4 words.",
  ],
  ["human", "{word}"],
]);

const chain = prompt.pipe(model);

const response = await chain.invoke({
  word: "human",
});

console.log(response);