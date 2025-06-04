import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { NavLink } from "react-router-dom";
import React from "react";
import { FaUserShield } from "react-icons/fa6";
import { BsFillShieldLockFill } from "react-icons/bs";
import { AiOutlineSwapRight } from "react-icons/ai";
import logo from "../assets/login_asserts/Logotr.png";
import FillButton from "./FillButton";
import TextBox from "./TextBox";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

interface loginProps {
  email: string;
  password: string;
  error: string | null;
  loading: boolean;
  show: boolean;
  setShow: (state: boolean) => void;
  setEmail: (email: string) => void;
  setPassword: (pwd: string) => void;
  handleLogin: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function LoginFormMD({
  email,
  password,
  error,
  loading,
  show,
  setShow,
  setEmail,
  setPassword,
  handleLogin,
}: loginProps) {
  return (
    <Grid container width={"100%"} height={"100%"} bgcolor={"rgb(0,0,0,0.1)"}>
      {/* Left side */}
      <Grid size={6} p={2}>
        <Box
          color={"white"}
          textAlign={"center"}
          //height={"calc(100% - 60px)"}
          height={"100%"}
          display={"flex"}
          flexDirection={"column"}
          justifyContent={"center"}
          alignItems={"center"}
        >
          <Typography
            sx={{
              fontSize: {
                xs: "25px",
                lg: "35px",
              },
              fontWeight: 800,
            }}
            fontFamily={"Montserrat"}
          >
            Smarter Skies, Greener Growth
          </Typography>
          <Typography padding={"1rem"} fontWeight={400}>
            Elevating Precision Agriculture into new heights!
          </Typography>
        </Box>
      </Grid>

      {/* Right side */}
      <Grid
        size={6}
        bgcolor={"hsl(0,0%,95%)"}
        height={"100%"}
        overflow={"auto"}
      >
        <Container
          sx={{
            height: "100%",
            minHeight: "450px",
            width: "80%",
            minWidth: "270px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            p: 1,
          }}
        >
          <Box textAlign="center" overflow={"auto"}>
            <Box
              component="img"
              src={logo}
              alt="logo"
              sx={{ width: { xs: "70px", lg: "90px" } }}
            />
            <Typography
              sx={{
                fontSize: {
                  xs: "18px",
                  lg: "25px",
                },
                fontWeight: 600,
              }}
              fontFamily={"Montserrat"}
            >
              Welcome Back!
            </Typography>
          </Box>

          <form onSubmit={handleLogin}>
            <Typography variant="subtitle2" textAlign={"center"} mb={2}>
              Enter your credentials to Log In
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Email address"
              value={email}
              name="email"
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <FaUserShield />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              fullWidth
              type={show ? "text" : "password"}
              label="Password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <BsFillShieldLockFill />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <IconButton size="small" onClick={() => setShow(!show)}>
                      {show ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  ),
                },
              }}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              endIcon={!loading && <AiOutlineSwapRight />}
              disabled={loading}
              sx={{
                mt: 1,
                backgroundColor: "#00796b",
                borderRadius: "10px",
                padding: { xs: 1, lg: "0.8rem" },
                color: "#fff",
                "&:hover": {
                  backgroundColor: "#004d40",
                  color: "#fff",
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Login"
              )}
            </Button>

            <Typography variant="body2" align="center" mt={2}>
              Forgot your password? <NavLink to={"/forgot"}>Click here</NavLink>
            </Typography>
          </form>
        </Container>
      </Grid>
    </Grid>
  );
}

export function LoginFormXS({
  email,
  password,
  error,
  loading,
  show,
  setShow,
  setEmail,
  setPassword,
  handleLogin,
}: loginProps) {
  return (
    <Grid container width={"100%"} spacing={2}>
      {/* Top */}
      <Grid size={12} p={2}>
        <Box
          textAlign={"center"}
          display={"flex"}
          flexDirection={"column"}
          justifyContent={"center"}
          alignItems={"center"}
        >
          <Typography
            sx={{
              fontSize: "25px",
              fontWeight: 600,
            }}
            fontFamily={"Montserrat"}
          >
            Smarter Skies, Greener Growth
          </Typography>
          <Typography padding={"0.7rem"} fontWeight={300}>
            Elevating Precision Agriculture into new heights!
          </Typography>
        </Box>
      </Grid>

      {/* Middle side */}
      <Grid size={12}>
        <Container
          sx={{
            bgcolor: "hsl(0,0%,95%)",
            width: "80%",
            minWidth: "320px",
            borderRadius: "10px",
            p: 3,
          }}
        >
          <Box textAlign="center">
            <Box component="img" src={logo} alt="logo" width={"70px"} />
            <Typography
              fontSize={"18px"}
              fontWeight={600}
              fontFamily={"Montserrat"}
            >
              Welcome Back!
            </Typography>
          </Box>

          <form onSubmit={handleLogin}>
            <Typography variant="subtitle2" textAlign={"center"} mb={2}>
              Enter your credentials to Log In
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {error}
              </Alert>
            )}

            <TextBox
              fullWidth
              label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <FaUserShield />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              fullWidth
              type={show ? "text" : "password"}
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <BsFillShieldLockFill />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <IconButton size="small" onClick={() => setShow(!show)}>
                      {show ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  ),
                },
              }}
            />

            <FillButton
              fullWidth
              type="submit"
              variant="contained"
              endIcon={!loading && <AiOutlineSwapRight />}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Login"
              )}
            </FillButton>

            <Typography variant="body2" align="center" mt={2}>
              Forgot your password? <NavLink to={"/forgot"}>Click here</NavLink>
            </Typography>
          </form>
        </Container>
      </Grid>
    </Grid>
  );
}
