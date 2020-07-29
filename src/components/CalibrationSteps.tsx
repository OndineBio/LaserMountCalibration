import React, {Fragment, useCallback, useEffect, useState} from "react";
import {createStyles, makeStyles, Theme} from "@material-ui/core/styles";
import io from "socket.io-client";
import {Button, Step, StepLabel, Stepper, Typography,} from "@material-ui/core";
import {LoaderBackdrop} from "./LoaderBackdrop";
import {CalibrateToPlate, Direction, Distance, WellName} from "./Steps/CalibrateToPlate";
import {ConnectToDevice} from "./Steps/ConnectToDevice";
import {LocatePuck} from "./Steps/LocatePuck";
import {AdjustTo100mw} from "./Steps/AdjustTo100mw";

const DEBUG = false; // display offset and position info for debugging
type Socket = SocketIOClient.Socket;

interface PositionLike {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

class Position implements PositionLike {
  readonly x: number;
  readonly y: number;
  readonly z: number;

  constructor({x, y, z}: PositionLike) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  subtract(p2: PositionLike): Position {
    return new Position({
      x: this.x - p2.x,
      y: this.y - p2.y,
      z: this.z - p2.z,
    })
  }

  static get zero(): Position {
    return new Position({x: 0, y: 0, z: 0})
  }

  equals(p2: PositionLike): boolean {
    return (
      this.x === p2.x &&
      this.y === p2.y &&
      this.z === p2.z
    )
  }

  add(p2: PositionLike): Position {
    return new Position({
      x: this.x + p2.x,
      y: this.y + p2.y,
      z: this.z + p2.z
    })
  }

}

const PORT = 5000


const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: "100%",
    },
    button: {
      marginRight: theme.spacing(1),
    },
    instructions: {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
    },
  })
);

export function CalibrationSteps() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const classes = useStyles();
  const [activeStep, setActiveStep] = React.useState(0);
  const [loaderIsOpen, setLoaderIsOpen] = useState<boolean>(false);
  const [offset, setOffset] = useState<Position>()
  const [currentPosition, setCurrentPosition] = useState<Position>()
  const [currentWellTop, setCurrentWellTop] = useState<Position>()
  const [zAbsMin, setZAbsMin] = useState<number>()
  const [laser100mwDistance, setLaser100mwDistance] = useState<number>()
  const [puckPosition, setPuckPosition] = useState<Position>()
  // handle socket cleanup
  useEffect(() => {
    return () => {
      socket?.disconnect()
    };
  }, [socket]);


  const openLoader = () => {

    setLoaderIsOpen(true);
  };
  const closeLoader = () => {

    setLoaderIsOpen(false);
  };
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const moveToPos = useCallback(async (num: 1 | 2 | 3) => await new Promise<void>((res, _) => {
      if (socket === null) throw Error("Socket is null")
      console.info("Moving to position " + num + "...")
      socket?.emit("moveToPos" + num, (json: {
        currentPosition: PositionLike, currentWellTop: PositionLike, currentOffset: PositionLike
      }) => {
        setCurrentPosition(new Position(json.currentPosition))
        setCurrentWellTop(new Position(json.currentWellTop))
        setOffset(new Position(json.currentOffset))
        console.info("Moved to position " + num)
        res()
      })
    }),
    [socket])
  const moveWithPosition = async (position: Position) => await new Promise<void>((res, _) => {
    socket?.emit("move", position, (json: { currentPosition: PositionLike }) => {
      setCurrentPosition(new Position(json.currentPosition))
      res()
    })
  })
  const move = async (direction: Direction, distance: Distance) => {
    if (currentPosition === undefined) throw new Error("Current Position is null!")
    if (offset === undefined) throw new Error("Offset is null!")
    let pos: Position = currentPosition
    switch (direction) {
      case Direction.toFront:
        pos = pos.add({x: 0, y: -1 * distance, z: 0})
        break;
      case Direction.toBack:
        pos = pos.add({x: 0, y: distance, z: 0})
        break;
      case Direction.up:
        pos = pos.add({x: 0, y: 0, z: distance})
        break;
      case Direction.down:
        pos = pos.add({x: 0, y: 0, z: -1 * distance})
        break;
      case Direction.left:
        pos = pos.add({x: -1 * distance, y: 0, z: 0})
        break;
      case Direction.right:
        pos = pos.add({x: distance, y: 0, z: 0})
        break;
    }
    await moveWithPosition(pos)
  }
  const updateOffset = useCallback(async () => {
    if (currentWellTop !== undefined && currentPosition !== undefined && zAbsMin !== undefined) {
      const offsetToSet = currentPosition.subtract(currentWellTop).subtract({
        x: 0,
        y: 0,
        z: zAbsMin
      })


      await new Promise<void>((res, _) => {
        socket?.emit("updateLaserOffsets", {offset: offsetToSet}, () => {
          res()
        })
      })
      setOffset(offsetToSet)
    } else {
      console.error(Error("currentWellTop, zAbsMin or currentPosition not set!"))
      console.error("currentWellTop:", currentWellTop, "currentPosition:", currentPosition, "zAbsMin:", zAbsMin)
    }
  }, [socket, currentPosition, currentWellTop, zAbsMin])
  const saveCalibration = async (offset: Position) => await new Promise<void>((res, _) => {
    socket?.emit("saveCalibration", {offset}, () => {
      res()
    })
  })
  const openSocket = async (ip: string) => {
    const temp_socket = io("http://" + ip + ":" + PORT, {
      autoConnect: false,
      timeout: 40000,
      rejectUnauthorized: false,
      agent: false
    })
    temp_socket.on('connect_error', function (error: Error) {
      console.warn("Connect Error:", error)
      socket?.io.reconnection(false);
    });
    console.info("Created Socket at " + ip + ":" + PORT)
    setSocket(temp_socket)
    console.info("connecting socket...")
    temp_socket.connect()
    const t = (condition: () => boolean, onComplete: () => void) => setTimeout(() => {
      if (condition()) {
        onComplete()
      } else {
        t(condition, onComplete)
      }
    }, 500)
    await new Promise((res) => {
      t(() => temp_socket.connected, () => res())
    })
    console.info("Connected socket!")
    console.info("initializing robot...")
    await new Promise((res => {
      temp_socket?.emit("init", ({zAbsMin, laser100mwDistance}: { zAbsMin: number, laser100mwDistance: number }) => {
        console.log("zAbsMin", zAbsMin, "laser100mwDistance", laser100mwDistance)
        setZAbsMin(zAbsMin)
        setLaser100mwDistance(laser100mwDistance)
        res()
      })
    }))
    console.info("initialized")
  }
  const endCalibration = async () => {
    await new Promise(res => {
      socket?.emit("end", () => {
        res()
      })
    })
    socket?.disconnect()
  }
  const handleReset = async () => {
    openLoader()
    await endCalibration()
    setActiveStep(0);
    closeLoader()
  };

  const onInit1 = useCallback(
    async () => {
      if (socket) {
        openLoader()
        await moveToPos(1)
        closeLoader()
      } else {
        throw Error("socket is null")
      }
    },
    [socket, moveToPos],
  );
  const onInit2 = useCallback(async () => {
    if (socket) {
      openLoader()
      await moveToPos(2)
      await updateOffset()
      closeLoader()
    } else {
      throw Error("socket is null")
    }
  }, [socket, moveToPos, updateOffset])
  const onInit3 = useCallback(async () => {
    openLoader()
    if (!socket) throw Error("socket is null")

    await updateOffset()
    await moveToPos(3)
    closeLoader()

  }, [socket, moveToPos, updateOffset])
  const saveLaserCalibration = useCallback(async () => {
    if (!socket) throw Error("socket is null")
    if (!puckPosition) throw Error("puckPosition is undefined")
    if (!currentPosition) throw Error("currentPosition is undefined")

    const newCalibration = currentPosition.z - puckPosition.z;

    await new Promise<void>(res => {
      socket.emit("saveLaserDistCalibration", {newCalibration}, () => {
        res()
      })
    })


  }, [socket, currentPosition, puckPosition])


  const steps = [
    <ConnectToDevice
      onDone={() => {
        handleNext()
      }}
      closeLoader={closeLoader}
      openSocket={openSocket}
      openLoader={openLoader}
    />,
    <CalibrateToPlate move={move}
                      onInit={onInit1}
                      onDone={() => {
                        handleNext()
                      }}
                      wellName={WellName.A1}/>,
    <CalibrateToPlate move={move}
                      onInit={onInit2}
                      onDone={() => handleNext()}
                      wellName={WellName.A12}
    />,
    <CalibrateToPlate move={move} onInit={onInit3} onDone={async () => {
      openLoader()
      await updateOffset()
      await moveToPos(1)
      closeLoader()
      handleNext()
    }} wellName={WellName.H12}
    />,
    <Fragment>
      <Button onClick={async () => {
        if (offset !== undefined) {
          openLoader()
          await saveCalibration(offset)
          closeLoader()
          setActiveStep(8);
        } else {
          console.error(Error("offset not set!"))
        }
      }}>Save Calibration and End</Button>
      <Button onClick={async () => {
        if (offset !== undefined) {
          openLoader()
          await saveCalibration(offset)
          closeLoader()
          handleNext()
        } else {
          console.error(Error("offset not set!"))
        }
      }}>Save Calibration and Calibrate laser height</Button>
    </Fragment>,
    <LocatePuck onDone={async () => {
      if (laser100mwDistance === undefined) throw new Error("laser100mwDistance undefined")
      setPuckPosition(currentPosition)
      await move(Direction.up, laser100mwDistance)
      handleNext()
    }} move={move} onInit={() => {
    }}/>,
    <AdjustTo100mw onDone={async () => {
      await saveLaserCalibration()
      handleNext()
    }} move={move} onInit={() => {
    }}/>,

  ]


  return (
    <div className={classes.root}>
      {DEBUG && <Typography>
        Current Position: {JSON.stringify(currentPosition)}
        Current Offset: {JSON.stringify(offset)}
        Current Well Top: {JSON.stringify(currentWellTop)}
      </Typography>}
      <Stepper activeStep={activeStep}>
        <Step>
          <StepLabel>Connect To Device</StepLabel>
        </Step>
        <Step>
          <StepLabel>Calibrate to A1</StepLabel>
        </Step>
        <Step>
          <StepLabel>Calibrate to A12</StepLabel>
        </Step>
        <Step>
          <StepLabel>Calibrate to H12</StepLabel>
        </Step>
        <Step>
          <StepLabel>Save Calibration</StepLabel>
        </Step>
        <Step>
          <StepLabel>Locate ILX Sensor</StepLabel>
        </Step>
        <Step>
          <StepLabel>Find correct power</StepLabel>
        </Step>
      </Stepper>
      <div>
        {activeStep === 7 ? (
          <div>
            <Typography className={classes.instructions}>
              All steps completed - you&apos;re finished
            </Typography>
            <Button onClick={handleReset} className={classes.button}>
              Reset
            </Button>
          </div>
        ) : (
          <div>
            {
              steps[activeStep]
            }
          </div>
        )}
      </div>
      <LoaderBackdrop open={loaderIsOpen}/>
    </div>
  );
}
