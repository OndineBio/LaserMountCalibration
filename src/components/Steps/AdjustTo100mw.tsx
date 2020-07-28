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
    gridTemplateColumns: "repeat(3, 1fr)",
    gridTemplateTows: " repeat(3, 1fr)",
    gridTemplateAreas: `". up ."\n". . ."\n". down ."`,
    maxWidth: "150px",
  },
  buttonUp: {gridArea: "up", width: "inherit"},
  buttonDown: {gridArea: "down", width: "inherit"},
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

export const AdjustTo100mw: FC<{
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
      switch (event.key) {
        case "ArrowUp":
          await move(Direction.up, moveDistance)
          break;
        case "ArrowDown":
          await move(Direction.down, moveDistance)
          break;
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
        Move laser up or down until probe reads 42mW
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
          Save
        </Button>
      </div>
    </Fragment>
  );
};