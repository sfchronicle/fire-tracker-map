#!/bin/bash

# Run with ./deploy.sh
# Params: subfolder, *project-name
# (starred params are optional)

# subfolder - Where the project should deploy (2018, tools, etc) 
# NOTE: ^ this script will not create subfolders! They must already exist.
# project-name (optional) - What the project should be called (the repo name by default)

# Var to track our error state
e="success"

# Callout color for important info
RED='\033[0;31m' 
GREEN='\033[0;32m'  
NC='\033[0m' # No color

# Spinner graphic for the upload delay
spinner(){
  local pid=$!
  local delay=0.15
  local spinstr='|/-\'
  while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
    local temp=${spinstr#?}
    printf " (%c)" "$spinstr"
    local spinstr=$temp${spinstr%"$temp"}
    sleep $delay
    printf "\b\b\b\b\b\b"
  done
  printf "    \b\b\b\b"
}

if [ -z "$1" ]; then
	echo -e "${RED}ERROR:${NC} No valid subfolder supplied!"
	echo "Exiting deploy script with error..."
	exit 1
fi

if [ -z "$2" ]; then
	# If no name supplied, we can assume it's the repo name
	path="${PWD##*/}"
else 
	# Use supplied name if there is one
	path="$2"
fi

if [ -d "build/" ]; then
	echo -e "${GREEN}SUCCESS:${NC} Build folder exists for this project."
else
	echo -e "${RED}ERROR:${NC} No build folder exists in this project! (Did you run grunt?)"
	echo "Exiting deploy script with error..."
fi

# Test if we can access the Projects folder
if [ -d "/Volumes/SFGextras/Projects/" ]; then
  echo -e "${GREEN}SUCCESS:${NC} Accessed Projects folder."
  # Test if we can access the specified subfolder
  if [ -d "/Volumes/SFGextras/Projects/$1" ]; then
  	echo -e "${GREEN}SUCCESS:${NC} Accessed $1 folder."
  	# Prompt before we pull the trigger
  	echo -e "All systems go. You are going to deploy ${RED}${PWD##*/}${NC} to the live Projects server in subfolder ${RED}$1${NC} with name ${RED}$path${NC}." 
  	read -p "Proceed (Y/n)? " -n 1 -r
		echo ""  # For spacing
		if [[ $REPLY =~ ^[Yy]$ ]]; then
		  echo "User confirmed deployment. Starting..."
		  echo "Removing any existing query strings..."
		  replaceJS="s/\.js\?.*?(?=(\"|\'))/\.js/g"
		  replaceCSS="s/\.css\?.*?(?=(\"|\'))/\.css/g"
		  perl -pi -e $replaceJS build/*.html
		  perl -pi -e $replaceCSS build/*.html
		  echo "Appending cache-busting strings..."
		  random=`date +%s`
		  replaceJS="s/\.js/\.js?$random/g"
		  replaceCSS="s/\.css/\.css?$random/g"
		  perl -pi -e $replaceJS build/*.html
		  perl -pi -e $replaceCSS build/*.html
		  echo "Uploading files to server..."
		  cp -a build/. "/Volumes/SFGextras/Projects/$1/$path" &
		  spinner
		  echo "Change index.html to index.php on server"
		  startpath="/Volumes/SFGextras/Projects/$1/$path/index.html"
		  endpath="/Volumes/SFGextras/Projects/$1/$path/index.php"
		  mv $startpath $endpath
		  echo -e "${GREEN}DEPLOY COMPLETE.${NC} Exiting..."
		else 
			echo "INFO: User cancelled deployment. Exiting..."
		fi
  else
		# We couldn't access subfolder
		echo -e "${RED}ERROR:${NC}: Subfolder $1 does not exist or cannot be accessed!"
		e="error"
	fi
else
	# We couldn't access /Projects/
	echo -e "${RED}ERROR:${NC}: Projects folder does not exist or cannot be accessed!"
	e="error"
fi

if [ "$e" == "error" ]; then
	echo "Exiting deploy script with error..."
fi