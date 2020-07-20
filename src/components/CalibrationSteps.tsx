import React, { FC, useState, Fragment } from "react";
import { makeStyles, Theme, createStyles } from "@material-ui/core/styles";
import Autocomplete, {
  createFilterOptions,
} from "@material-ui/lab/Autocomplete";
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  Radio,
  RadioGroup,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@material-ui/core";
import { LoaderBackdrop } from "./LoaderBackdrop";
import {
  ArrowBack,
  ArrowDownward,
  ArrowForward,
  ArrowUpward,
} from "@material-ui/icons";

const useCalibrateToPlateStyles = makeStyles({
  title: {
    textAlign: "center",
  },
  keyContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gridTemplateTows: " repeat(3,1fr)",
    gridTemplateAreas: `". up ."\n"left . right"\n". down ."`,
    maxWidth: "250px",
    // background: "pink",
  },
  buttonUp: { gridArea: "up", width: "inherit" },
  buttonDown: { gridArea: "down", width: "inherit" },
  buttonLeft: { gridArea: "left", width: "inherit" },
  buttonRight: { gridArea: "right", width: "inherit" },
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

const CalibrateToPlate: FC<{ onDone: () => void; wellName: WellName }> = ({
  onDone,
  wellName,
}) => {
  const classes = useCalibrateToPlateStyles();
  const [moveDistance, setMoveDistance] = useState<Distance>(Distance.MM0_1);
  return (
    <Fragment>
      <Typography className={classes.title} variant="h4">
        {" "}
        Calibrate to well {wellName}
      </Typography>
      <div className={classes.controlGroup}>
        <FormControl component="fieldset">
          <FormLabel component="legend">Movement Distance</FormLabel>
          <RadioGroup
            aria-label="move-distance"
            name="move-distance"
            value={moveDistance}
            onChange={(e) => {
              setMoveDistance(Number(e.target.value) as Distance);
            }}
          >
            <FormControlLabel
              value={Distance.MM0_1}
              control={<Radio />}
              label="0.1 mm"
            />
            <FormControlLabel
              value={Distance.MM1}
              control={<Radio />}
              label="1 mm"
            />
            <FormControlLabel
              value={Distance.MM10}
              control={<Radio />}
              label="10 mm"
            />
          </RadioGroup>
        </FormControl>
        <div className={classes.keyContainer}>
          <Button className={classes.buttonUp} variant="outlined">
            <ArrowUpward />
          </Button>
          <Button className={classes.buttonDown} variant="outlined">
            <ArrowDownward />
          </Button>
          <Button className={classes.buttonLeft} variant="outlined">
            <ArrowBack />
          </Button>
          <Button className={classes.buttonRight} variant="outlined">
            <ArrowForward />
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
  onDone: () => void;
  openLoader: () => void;
  closeLoader: () => void;
}> = ({ onDone, openLoader, closeLoader }) => {
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
        style={{ width: 300 }}
        onClose={(e) => {
          console.log("blur");
          if (isValidIp(ipAddress) || ipAddress === "") {
            console.log(isValidIp(ipAddress), ipAddress !== "");
            setInvalidIp(false);
          } else {
            setInvalidIp(true);
          }
        }}
        onChange={(event, newValue) => {
          console.log(newValue);

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
              console.log(e.target.value);
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
      <br />
      <Button
        onClick={async () => {
          const timer = () =>
            new Promise<void>((res) => {
              setTimeout(() => {
                res();
              }, 3000);
            });
          openLoader();
          await timer();
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

export function CalibrationSteps() {
  const classes = useStyles();
  const [activeStep, setActiveStep] = React.useState(0);
  const [loaderIsOpen, setLoaderIsOpen] = useState<boolean>(false);

  const openLoader = () => {
    setLoaderIsOpen(true);
  };
  const closeLoader = () => {
    setLoaderIsOpen(false);
  };
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  return (
    <div className={classes.root}>
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
              [
                <ConnectToDeviceStep
                  closeLoader={closeLoader}
                  onDone={handleNext}
                  openLoader={openLoader}
                />,
                <CalibrateToPlate onDone={handleNext} wellName={WellName.A1} />,
                <CalibrateToPlate
                  onDone={handleNext}
                  wellName={WellName.A12}
                />,
                <CalibrateToPlate
                  onDone={handleNext}
                  wellName={WellName.H12}
                />,
                <Button onClick={handleNext}>Save Calibration</Button>,
              ][activeStep]
            }
          </div>
        )}
      </div>
      <LoaderBackdrop open={loaderIsOpen} />
    </div>
  );
}
