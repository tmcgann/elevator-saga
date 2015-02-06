"use strict";

var myo = {
    init: function (elevators, floors) {
        var
            enums = {
                direction: {
                    DOWN: "down",
                    UP: "up"
                }
            },
            waitingFloorsMap = {
                down: [],
                up: []
            };

        // FUNCTIONS
        function assignEventsToElevator(elevator) {
            elevator.on("floor_button_pressed", function (floorNum) {
                var elevator = this,
                    elevatorDirection = calcElevatorDirection(elevator, floorNum);
                setElevatorIndicator(elevator, elevatorDirection);
                insertAscOrder(elevator.destinationQueue, floorNum);
                elevator.checkDestinationQueue();
            });
            elevator.on("idle", function goToClosestWaitingFloor() {
                var elevator = this,
                    waitingFloors = union(waitingFloorsMap.down, waitingFloorsMap.up),
                    closestFloor = getClosestFloor(elevator, waitingFloors);

                elevator.goToFloor(closestFloor);
            });
            elevator.on("passing_floor", function (floorNum, direction) {
                // Decide whether to stop or not:
                //// Is this floor's button pressed?
                //// OR
                //// Is this floor waiting to be served?
                //// Do I have capacity?
                //// Am I headed in the same direction as passengers on this floor?

                var elevator = this,
                    isFloorButtonPressed = contains(elevator.getPressedFloors(), floorNum),
                    isFloorInQueue = contains(elevator.destinationQueue, floorNum),
                    isFloorWaiting = contains(waitingFloorsMap[direction], floorNum),
                    hasSpace = hasCapacity(elevator),
                    isSameDirection = true; //TODO: update this!

                // setElevatorIndicator(elevator, direction);

                if (isFloorButtonPressed) {

                }

                if (isFloorWaiting && hasSpace && isSameDirection) {

                }
            });
            elevator.on("stopped_at_floor", function (floorNum) {
                // Decide where to go
            });
        }

        function assignEventsToFloor(floor) {
            floor.on("up_button_pressed", function () {
                // Fetch an elevator that's idle (or maybe already going up?)
                var floor = this;
                signalElevator(floor.floorNum(), enums.direction.UP);
            });
            floor.on("down_button_pressed", function () {
                // Fetch an elevator that's idle (or maybe already going down?)
                var floor = this;
                signalElevator(floor.floorNum(), enums.direction.DOWN);
            });
        }

        function calcElevatorDirection(elevator, destinationFloor) {
            var difference = destinationFloor - elevator.currentFloor();
            return (difference < 0) ? enums.direction.DOWN : enums.direction.UP;
        }

        function calcElevatorFloorAbsDistance(elevator, floorNum) {
            return Math.abs(elevator.currentFloor() - floorNum);
        }

        function calcElevatorFloorDistance(elevator, floorNum, direction) {
            switch (direction) {
                case enums.direction.DOWN:
                    return elevator.currentFloor() - floorNum;

                case enums.direction.UP:
                    return floorNum - elevator.currentFloor();

                default:
                    return calcElevatorFloorAbsDistance(elevator, floorNum);
            }
        }

        function getClosestElevator(elevs, floorNum, direction) {
            return reduce(elevs, function (selectedElevator, curElevator) {
                if (typeof selectedElevator === "undefined") {
                    return curElevator;
                }

                var selectedElevatorDistance = calcElevatorFloorDistance(selectedElevator, floorNum, direction),
                    curElevatorDistance = calcElevatorFloorDistance(curElevator, floorNum, direction);
                if (curElevatorDistance > 0 && curElevatorDistance < selectedElevatorDistance) {
                    return curElevator;
                }

                return selectedElevator;
            });
        }

        function getClosestFloor(elevator, floorNumbers) {
            return reduce(floorNumbers, function (selectedFloor, curFloor) {
                if (typeof selectedFloor === "undefined") {
                    return curFloor;
                }

                var selectedFloorDistance = calcElevatorFloorAbsDistance(elevator, selectedFloor),
                    curFloorDistance = calcElevatorFloorAbsDistance(elevator, curFloor);

                if (curFloorDistance < selectedFloorDistance) {
                    return curFloor;
                }

                return selectedFloor;
            });
        }

        function getDirectionalElevators(direction, includeIdleElevators) {
            var directionPredicate = includeIdleElevators ? getDirectionOrIdlePredicate(direction) : getDirectionPredicate(direction),
                filteredElevators = filter(elevators, directionPredicate);
            return filteredElevators;
        }

        function getDirectionPredicate(direction) {
            return (direction === enums.direction.DOWN) ? isGoingDown : isGoingUp;
        }

        function getDirectionOrIdlePredicate(direction) {
            return (direction === enums.direction.DOWN) ? isGoingDownOrIdle : isGoingUpOrIdle;
        }

        function getElevator(floor, direction) {
            var bestElevator, possibleElevators;

            possibleElevators = getIdleElevators();
            // possibleElevators = possibleElevators.length ? possibleElevators : getDirectionalElevators(direction, false);
            bestElevator = getClosestElevator(possibleElevators, floor, direction);

            return bestElevator;
        }

        function getIdleElevators(elevs) {
            elevs = elevs || elevators;
            var filteredElevators = filter(elevs, isIdle);
            return filteredElevators;
        }

        function hasCapacity(elevator) {
            return elevator.loadFactor() <= 0.95;
        }

        function isGoingDown(elevator) {
            return elevator.goingDownIndicator();
        }

        function isGoingDownOrIdle(elevator) {
            return isGoingDown(elevator) || isIdle(elevator);
        }

        function isGoingUp(elevator) {
            return elevator.goingUpIndicator();
        }

        function isGoingUpOrIdle(elevator) {
            return isGoingUp(elevator) || isIdle(elevator);
        }

        function isIdle(elevator) {
            return !elevator.goingUpIndicator() && !elevator.goingDownIndicator();
        }

        function isMoving(elevator) {
            return elevator.goingUpIndicator() || elevator.goingDownIndicator();
        }

        function setElevatorIndicator(elevator, direction) {
            switch (direction) {
                case enums.direction.DOWN:
                    elevator.goingDownIndicator(true);
                    elevator.goingUpIndicator(false);
                    break;
                case enums.direction.UP:
                    elevator.goingDownIndicator(false);
                    elevator.goingUpIndicator(true);
                    break;
                default:
                    elevator.goingDownIndicator(false);
                    elevator.goingUpIndicator(false);
            }
        }

        function signalElevator(floorNum, direction) {
            var elevator = getElevator(floorNum, direction),
                elevatorDirection;

            if (!elevator) {
                return;
            }

            elevatorDirection = calcElevatorDirection(elevator, floorNum);
            setElevatorIndicator(elevator, elevatorDirection);
            elevator.goToFloor(floorNum);

            // if (contains(elevator.destinationQueue, floorNum)) {
            //     return; // assume floorNum is in correct sequence position
            // }

            // insertAscOrder(elevator.destinationQueue, floorNum);
            // elevator.checkDestinationQueue();
        }

        // UTILITY FUNCTIONS
        function contains(collection, item) {
            var length = collection.length,
                isItem;
            for (var i = 0; i < length; i++) {
                isItem = collection[i] === item;
                if (isItem) {
                    return isItem;
                }
            }
            return isItem;
        }

        function filter(collection, predicate) {
            var subset = [];
            for (var i = collection.length - 1; i >= 0; i--) {
                var result = predicate(collection[i], i);
                if (!!result) {
                    subset.push(collection[i]);
                }
            }
            return subset;
        }

        function find(collection, predicate) {
            var length = collection.length,
                isItem;
            for (var i = 0; i < length; i++) {
                isItem = predicate(collection[i], i);
                if (!!isItem) {
                    return collection[i];
                }
            }
        }

        function forEach(collection, actOn) {
            for (var i = collection.length - 1; i >= 0; i--) {
                actOn(collection[i], i);
            }
            return collection;
        }

        function insertAscOrder(arr, val) {
            var i = 0,
                length = arr.length;
            while (i < length && arr[i] < val) {
                i++;
            }
            arr.splice(i, 0, val);
        }

        // function insertAscOrderSorted(arr, val) {
        //     // get the middle index
        //     // get the middle value
        //     // compare to passed value
        //     //// if less than then iterate over left
        //     //// if greater than then iterate over right
        //     //// else insert after/before -- whatever's more convenient
        //     var i = middleIndex(arr),
        //         curVal = arr[i];

        //     if (curVal < val) {

        //     } else if (curVal > val) {

        //     } else {

        //     }
        // }

        function middleIndex(arr) {
            return Math.ceiling((arr.length - 1) / 2);
        }

        function reduce(collection, predicate, memo) {
            var length = collection.length;
            for (var i = 0; i < length; i++) {
                memo = predicate(memo, collection[i], i);
            }
            return memo;
        }

        function union(arr1, arr2) {
            var combinedArr = [];
            forEach(arr1, function (item) {
                combinedArr.push(item);
            });
            forEach(arr2, function (item) {
                if (!contains(combinedArr, item)) {
                    combinedArr.push(item);
                }
            });
            return combinedArr;
        }

        // GO
        function go() {
            forEach(elevators, assignEventsToElevator);
            forEach(floors, assignEventsToFloor);
        }

        go();
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}