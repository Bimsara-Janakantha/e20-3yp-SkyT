import {
  AppBar,
  Badge,
  Box,
  Drawer,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { ReactElement, useEffect, useState } from "react";
import MenuItem from "./MenuItem";
import { NavLink } from "react-router-dom";
import NotificationsIcon from "@mui/icons-material/Notifications";
import logo from "../assets/login_asserts/Logotr.png";
import IconMenu from "./IconMenu";
import { useAuth } from "../context/AuthContext";

// Width of the drawer
const drawerWidth = 230;

interface ItemProps {
  label: string;
  icon: ReactElement;
  path: string;
}

export default function AppBar1({ menu }: { menu: ItemProps[] }) {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [msgCount, setMessageCount] = useState<number>(0);

  useEffect(() => {
    const tokenCount = user?.msgCount;
    if (tokenCount) {
      setMessageCount(tokenCount);
    }
  }, [user?.msgCount]);

  return (
    <AppBar position="sticky" color="default">
      <Toolbar
        sx={{
          px: 2,
          py: 1,
          height: 9,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {/* Menu Icon */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="end"
          onClick={() => setDrawerOpen(true)}
        >
          <MenuIcon sx={{ fontSize: 30 }} />
        </IconButton>

        {/* User profile */}
        <Stack direction={"row"} gap={1} alignItems={"center"}>
          <Tooltip title={"Notifications"}>
            <Badge
              component={NavLink}
              to={"/notifications"}
              badgeContent={msgCount}
              color="primary"
              max={9}
            >
              <NotificationsIcon color="action" sx={{ fontSize: 30 }} />
            </Badge>
          </Tooltip>

          <IconMenu />
        </Stack>

        {/* Drawer */}
        <Drawer
          anchor="left"
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              bgcolor: "ghostwhite",
            },
          }}
        >
          <Box
            role="presentation"
            display={"flex"}
            flexDirection={"column"}
            alignItems={"end"}
          >
            <IconButton
              sx={{ m: 1, mb: 2 }}
              onClick={() => setDrawerOpen(false)}
            >
              <CloseIcon sx={{ fontSize: 30, color: "black" }} />
            </IconButton>

            <Box
              display={"flex"}
              flexDirection={"column"}
              alignItems={"center"}
              width={"100%"}
            >
              <Box
                component="img"
                src={logo}
                alt="logo"
                width={"90px"}
                mb={3}
                sx={{ cursor: "pointer" }}
              />

              {menu.map((item, index) => (
                <MenuItem
                  key={index}
                  path={item.path}
                  label={item.label}
                  icon={item.icon}
                />
              ))}
            </Box>
          </Box>
        </Drawer>
      </Toolbar>
    </AppBar>
  );
}
