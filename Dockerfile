FROM ubuntu:18.04
ARG CODE_PATH
ARG DATA_PATH
RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections
RUN mkdir $CODE_PATH
RUN mkdir $DATA_PATH
WORKDIR $CODE_PATH
RUN apt update
RUN apt install apt-utils curl -y
RUN curl -sL https://deb.nodesource.com/setup_12.x -o nodesource_setup.sh
RUN chmod u+x nodesource_setup.sh
RUN ./nodesource_setup.sh
RUN apt install nodejs -y
COPY . $CODE_PATH
RUN npm install
