import React, {FC, useState, Fragment, useEffect, useCallback} from "react";
import {makeStyles, Theme, createStyles} from "@material-ui/core/styles";
import io from "socket.io-client";
import Autocomplete, {
  createFilterOptions,
} from "@material-ui/lab/Autocomplete";
import {
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@material-ui/core";
import {LoaderBackdrop} from "./LoaderBackdrop";
import {
  ArrowBack,
  ArrowDownward,
  ArrowForward,
  ArrowUpward,
} from "@material-ui/icons";

const DEBUG = false; // display offset and position info for debugging
type Socket = SocketIOClient.Socket;

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

enum WellName {
  A1 = "A1",
  A12 = "A12",
  H12 = "H12",
}

enum Distance {
  MM0_1 = 0.1,
  MM1 = 1,
  MM10 = 10,
}

enum Direction {
  toBack,
  toFront,
  up,
  down,
  left,
  right
}

const CalibrateToPlate: FC<{
  onDone: () => void;
  onInit: () => void
  wellName: WellName,
  move: (direction: Direction, distance: Distance) => Promise<void>;
}> = ({
        onDone,
        onInit,
        wellName,
        move
      }) => {
  const classes = useCalibrateToPlateStyles();
  const [moveDistance, setMoveDistance] = useState<Distance>(Distance.MM0_1);
  const [ranForWell, setRanForWell] = useState<WellName | null>(null)
  useEffect(() => {
    if (ranForWell !== wellName) {
      setRanForWell(wellName) // make sure init is only ran once for each well
      onInit()
    }
  }, [onInit, ranForWell, wellName])
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
        Calibrate to well {wellName}
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

const filter = createFilterOptions<string>();
const ConnectToDeviceStep: FC<{
  // socket: Socket | null,
  openSocket: (ip: string) => Promise<void>;
  onDone: () => void;
  openLoader: () => void;
  closeLoader: () => void;
}> = ({onDone, openLoader, closeLoader, openSocket}) => {

  const IP_ADDR_STORAGE_KEY = "ConnectToDeviceStep_ip_addresses";
  const [ipAddress, setIpAddress] = useState<string>("");
  const getSavedOptions = (): string[] => {
    const ipAddressJson = localStorage.getItem(IP_ADDR_STORAGE_KEY);
    let savedIpAddresses = [];
    if (ipAddressJson) {
      savedIpAddresses = JSON.parse(ipAddressJson);
    }
    return savedIpAddresses as string[];
  };
  const [ipAddressOptions, setIpAddressOptions] = useState<string[]>(
    getSavedOptions()
  );
  const saveNewIpAddress = (ipAddr: string) => {
    if (!ipAddressOptions.includes(ipAddr)) {
      setIpAddressOptions((prev) => {
        const updated = [ipAddr, ...prev];
        localStorage.setItem(IP_ADDR_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  };
  const [invalidIp, setInvalidIp] = useState(false);
  const isValidIp = (ipAddr: string): boolean =>
    /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ipAddr);

  return (
    <Fragment>
      <Autocomplete
        id="combo-box-demo"
        options={ipAddressOptions}
        noOptionsText={"Invalid IP address"}
        value={ipAddress === "" ? null : ipAddress}
        style={{width: 300}}
        onClose={() => {
          if (isValidIp(ipAddress) || ipAddress === "") {
            setInvalidIp(false);
          } else {
            setInvalidIp(true);
          }
        }}
        onChange={(event, newValue) => {

          if (typeof newValue === "string") {
            if (newValue.includes("Add")) {
              setIpAddress(newValue.replace(/Add "(.+)"/, "$1"));
              setInvalidIp(false);
              saveNewIpAddress(newValue.replace(/Add "(.+)"/, "$1"));
            } else {
              setIpAddress(newValue);
            }
          }
          // } else (newValue) {
          //   // Create a new value from the user input
          //   setIpAddress(newValue);
          // }
        }}
        filterOptions={(options, params) => {
          const filtered = filter(options, params);
          // Suggest the creation of a new value
          if (params.inputValue !== "") {
            if (isValidIp(params.inputValue)) {
              filtered.push(`Add "${params.inputValue}"`);
            }
          }
          return filtered;
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            error={invalidIp}
            onChange={(e) => {
              if (isValidIp(e.target.value) && e.target.value !== "") {
                setInvalidIp(false);
              } else {
                setInvalidIp(true);
              }
            }}
            helperText={invalidIp && "Invalid IP address"}
            label="Robot IP Address"
            variant="outlined"
          />
        )}
      />
      <br/>
      <Button
        disabled={!isValidIp(ipAddress)}
        onClick={async () => {
          openLoader();
          await openSocket(ipAddress)
          closeLoader();
          onDone();
        }}
        variant="outlined"
        color="primary"
      >
        Connect
      </Button>
    </Fragment>
  );
};

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


export function CalibrationSteps() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const classes = useStyles();
  const [activeStep, setActiveStep] = React.useState(0);
  const [loaderIsOpen, setLoaderIsOpen] = useState<boolean>(false);
  const [offset, setOffset] = useState<Position>()
  const [currentPosition, setCurrentPosition] = useState<Position>()
  const [currentWellTop, setCurrentWellTop] = useState<Position>()
  const [zAbsMin, setZAbsMin] = useState<number>()

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
    const temp_socket = io(ip + ":" + PORT, {
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
      temp_socket?.emit("init", ({zAbsMin}: { zAbsMin: number }) => {
        console.log("zAbsMin", zAbsMin)
        setZAbsMin(zAbsMin)
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
    if (socket) {
      await updateOffset()
      await moveToPos(3)
      closeLoader()
    } else {
      throw Error("socket is null")
    }
  }, [socket, moveToPos, updateOffset])

  const steps = [
    <ConnectToDeviceStep
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
    <Button onClick={async () => {
      if (offset !== undefined) {
        openLoader()
        await saveCalibration(offset)
        closeLoader()
        handleNext()
      } else {
        console.error(Error("offset not set!"))
      }
    }}>Save Calibration</Button>,
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
      </Stepper>
      <div>
        {activeStep === 5 ? (
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
