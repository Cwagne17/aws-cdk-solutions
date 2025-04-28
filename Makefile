#!/bin/bash

# Libraries
CDK := node node_modules/.bin/cdk
pattern: pattern_name := $(firstword $(filter-out pattern, $(MAKECMDGOALS)))
pattern: pattern_command := $(subst pattern $(pattern_name), , $(MAKECMDGOALS))

pattern_files := $(notdir $(wildcard bin/*.ts))
formatted_pattern_names := $(patsubst %.ts,%,$(pattern_files))

list:
	@$ echo "To work with patterns use: \n\t$$ make pattern <pattern-name> <list | deploy | synth | destroy>"
	@$ echo "Example:\n\t$$ make pattern fargate deploy \n\nPatterns: \n"
	@$ $(foreach pattern, $(formatted_pattern_names),  echo "\t$(pattern)";)

pattern:
	@echo $(pattern_name) performing $(pattern_command)
	$(CDK) --app "npx ts-node bin/$(pattern_name).ts" $(if $(pattern_command),$(pattern_command), list)
	@:
%:
	@:

