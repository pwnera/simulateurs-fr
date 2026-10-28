# Serveur MCP en stdio, hors ligne : pour Glama et les clients MCP qui lancent un conteneur.
# docker build -t simulateurs-fr . && docker run -i --rm simulateurs-fr
FROM node:22-alpine
RUN npm install -g @calculsalairebrutnet/mcp@^1.1.0
ENTRYPOINT ["calculsalairebrutnet-mcp"]
