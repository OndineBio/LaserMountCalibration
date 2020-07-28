import {makeStyles} from "@material-ui/core/styles";
import React, {FC, Fragment, useEffect, useState} from "react";
import {Button, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Typography} from "@material-ui/core";
import {ArrowBack, ArrowDownward, ArrowForward, ArrowUpward} from "@material-ui/icons";

const useCalibrateToPlateStyles = makeStyles({
  title: {
    textAlign: "center",
  },
  keyContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(5,1fr)",
    gridTemplateTows: " repeat(3,1fr)",
    gridTemplateAreas: `". toBack . . up "\n"left . right . ."\n". toFront . . down"`,
    maxWidth: "350px",
  },
  buttonToBack: {gridArea: "toBack", width: "inherit"},
  buttonToFront: {gridArea: "toFront", width: "inherit"},
  buttonUp: {gridArea: "up", width: "inherit"},
  buttonDown: {gridArea: "down", width: "inherit"},
  buttonLeft: {gridArea: "left", width: "inherit"},
  buttonRight: {gridArea: "right", width: "inherit"},
  controlGroup: {
    margin: "32px auto",
    display: "flex",
    justifyContent: "space-around",
  },
  centerButtonDiv: {
    display: "grid",
    placeItems: "center",
  },
});

export enum Distance {
  MM0_1 = 0.1,
  MM1 = 1,
  MM10 = 10,
}

export enum Direction {
  toBack,
  toFront,
  up,
  down,
  left,
  right
}

export const LocatePuck: FC<{
  onDone: () => void;
  onInit: () => void
  move: (direction: Direction, distance: Distance) => Promise<void>;
}> = ({
        onDone,
        onInit,
        move
      }) => {
  const classes = useCalibrateToPlateStyles();
  const [moveDistance, setMoveDistance] = useState<Distance>(Distance.MM0_1);
  useEffect(() => {
      onInit()
  }, [onInit])
  useEffect(() => {
    const keydownFunc = async (event: KeyboardEvent) => {
      if (event.shiftKey) {
        switch (event.key) {
          case "ArrowUp":
            await move(Direction.up, moveDistance)
            break;
          case "ArrowDown":
            await move(Direction.down, moveDistance)
            break;
        }
      } else {
        switch (event.key) {
          case "ArrowUp":
            await move(Direction.toBack, moveDistance)
            break;
          case "ArrowDown":
            await move(Direction.toFront, moveDistance)
            break;
          case "ArrowLeft":
            await move(Direction.left, moveDistance)
            break;
          case "ArrowRight":
            await move(Direction.right, moveDistance)
            break;

        }

      }
    }
    document.addEventListener("keydown", keydownFunc, false)

    return () => {
      document.removeEventListener("keydown", keydownFunc, false)
    }
  }, [moveDistance, move])

  return (
    <Fragment>
      <Typography className={classes.title} variant="h4">
        Move To center of ILX puck
      </Typography>
      <Typography className={classes.title} variant="h6">
      Make sure the tip of the laser is centered on the opening of the puck
      </Typography>
      <div className={classes.controlGroup}>
        <FormControl component="fieldset">
          <FormLabel component="legend">Movement Distance</FormLabel>
          <RadioGroup
            onKeyDown={(e) => {
              e.preventDefault()
            }}
            aria-label="move-distance"
            name="move-distance"
            value={moveDistance}
            onChange={(e) => {
              setMoveDistance(Number(e.target.value) as Distance);
            }}
          >
            <FormControlLabel
              value={Distance.MM0_1}
              control={<Radio/>}
              label="0.1 mm"
            />
            <FormControlLabel
              value={Distance.MM1}
              control={<Radio/>}
              label="1 mm"
            />
            <FormControlLabel
              value={Distance.MM10}
              control={<Radio/>}
              label="10 mm"
            />
          </RadioGroup>
        </FormControl>
        <div className={classes.keyContainer}>
          <Button onClick={async () => {
            await move(Direction.up, moveDistance)
          }} className={classes.buttonUp} variant="outlined">
            <ArrowUpward/>
          </Button>
          <Button onClick={async () => {
            await move(Direction.down, moveDistance)
          }} className={classes.buttonDown} variant="outlined">
            <ArrowDownward/>
          </Button>
          <Button onClick={async () => {
            await move(Direction.toBack, moveDistance)
          }} className={classes.buttonToBack} variant="outlined">
            <ArrowUpward/>
          </Button>
          <Button onClick={async () => {
            await move(Direction.toFront, moveDistance)
          }} className={classes.buttonToFront} variant="outlined">
            <ArrowDownward/>
          </Button>
          <Button onClick={async () => {
            await move(Direction.left, moveDistance)
          }} className={classes.buttonLeft} variant="outlined">
            <ArrowBack/>
          </Button>
          <Button onClick={async () => {
            await move(Direction.right, moveDistance)
          }} className={classes.buttonRight} variant="outlined">
            <ArrowForward/>
          </Button>
        </div>
      </div>
      <div className={classes.centerButtonDiv}>
        <Button
          onClick={() => {
            onDone();
          }}
          color="primary"
          size="large"
          variant="outlined"
        >
          Next
        </Button>
      </div>
    </Fragment>
  );
};