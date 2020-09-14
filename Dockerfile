FROM ubuntu:18.04
RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections
RUN mkdir /document-cache-code
RUN mkdir /document-cache-data
WORKDIR /document-cache-code
RUN apt update
RUN apt install apt-utils curl -y
RUN curl -sL https://deb.nodesource.com/setup_12.x -o nodesource_setup.sh
RUN chmod u+x nodesource_setup.sh
RUN ./nodesource_setup.sh
RUN apt install nodejs -y
COPY . /document-cache-code
RUN npm install
