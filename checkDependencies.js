const dependencies = [
    "@langchain/openai",
    "langchain/chains/combine_documents",
    "@langchain/core/prompts",
    "cheerio",
    "langchain/text_splitter",
    "langchain/vectorstores/memory",
    "langchain/chains/retrieval",ch
    "langchain/chains/history_aware_retriever",
    "@langchain/core/prompts",
    "@langchain/core/messages",
    "dotenv"
  ];
  
  dependencies.forEach(dep => {
    try {
      require(dep);
      console.log(`✅ ${dep} is installed.`);
    } catch (error) {
      console.error(`❌ ${dep} is not installed.`);
    }
  });