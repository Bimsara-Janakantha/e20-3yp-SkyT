import {
  Badge,
  Breadcrumbs,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import NotificationsIcon from "@mui/icons-material/Notifications";
import IconMenu from "../components/IconMenu";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import SearchBox from "../components/SearchBox";
import Link from "@mui/material/Link";
import { getData } from "../api/NodeBackend";
import { useAuth } from "../context/AuthContext";
import { AxiosError } from "axios";
import { ToastAlert } from "../components/ToastAlert";
import { useLoading } from "../context/LoadingContext";

interface DashboardAreaProps {
  search: string;
  setSearch: (text: string) => void;
}

interface estateProps {
  id: number;
  estate: string;
}

interface lotProps {
  id: number;
  lot: string;
}

interface ErrorResponse {
  error: string;
}

function DashboardArea({ search, setSearch }: DashboardAreaProps) {
  const navigator = useNavigate();
  const { user } = useAuth();
  const { setLoading } = useLoading();

  // Get the path and split it
  const path = useLocation().pathname;
  const allSections = path.split("/").filter(Boolean); // remove empty strings

  // Separate into links and breadcrumbs
  const links: string[] = [];
  const breadcrumbs: string[] = [];
  const estateList: string | null = sessionStorage.getItem("estates");
  const lotList: string | null = sessionStorage.getItem("lots");

  // Home Section
  if (allSections.length > 0) {
    breadcrumbs.push("Home");
    links.push("home");
  }

  // Estate Section
  if (allSections.length > 2 && estateList) {
    try {
      const estates: estateProps[] = JSON.parse(estateList);
      const matchedEstate = estates.find(
        (estate) => String(estate.id) === allSections[2]
      );

      if (matchedEstate) {
        // If an estate with matching ID is found
        breadcrumbs.push(matchedEstate.estate);
        const link = allSections.slice(0, 3).join("/");
        links.push(link);
      }
    } catch (error) {
      console.error("Error parsing estate list from sessionStorage:", error);
    }
  }

  // Estate Map Section
  if (allSections.length === 4) {
    const word =
      allSections[3].charAt(0).toUpperCase() + allSections[3].slice(1);
    breadcrumbs.push(word);

    console.log("Map word: ", word);
  }

  // Lot Section
  if (allSections.length > 4 && lotList) {
    try {
      const lots: lotProps[] = JSON.parse(lotList);
      const matchedLot = lots.find((lot) => String(lot.id) === allSections[4]);

      if (matchedLot) {
        // If an lot with matching ID is found
        breadcrumbs.push(matchedLot.lot);
        const link = allSections.slice(0, 5).join("/");
        links.push(link);
      }
    } catch (error) {
      console.error("Error parsing lot list from sessionStorage:", error);
    }
  }

  // Special Option Section
  if (allSections.length > 5) {
    const word =
      allSections[5].charAt(0).toUpperCase() + allSections[5].slice(1);
    breadcrumbs.push(word);
  }

  const [name, setName] = useState<string>();

  const [msgCount, setMsgCount] = useState<number>();

  useEffect(() => {
    const tokenCount = user?.msgCount;
    if (tokenCount) {
      setMsgCount(tokenCount);
    }
  }, [user?.msgCount]);

  useEffect(() => {
    const getInfo = async () => {
      const url = `users/home/${user?.userId}`;

      setLoading(true);

      try {
        const serverResponse = await getData(url);
        if (serverResponse.status === 200) {
          const { message, fName, msgCount } = serverResponse.data;
          console.log(message);
          setMsgCount(msgCount);
          setName(fName);
        }
      } catch (err) {
        const error = err as AxiosError<ErrorResponse>;
        const status = error.response?.status;

        let errMsg;

        if (status === 404 || status === 400) {
          console.log(error.response?.data?.error);
          errMsg = error.response?.data?.error;
        }

        console.log("Dashboard Error:", errMsg);
        ToastAlert({
          type: "error",
          title: errMsg || "Something went wrong",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      getInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <Grid container spacing={3} fontFamily={"Montserrat"}>
      {/* Welcome Message */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <Typography fontWeight={700} fontFamily={"inherit"} variant="h5" noWrap>
          Welcome {name}
        </Typography>

        <Breadcrumbs aria-label="breadcrumb">
          {breadcrumbs?.slice(0, -1).map((section, index) => {
            const goto = "/" + links[index];
            return (
              <Link
                key={index}
                underline="hover"
                color="inherit"
                component={NavLink}
                to={goto}
              >
                {section}
              </Link>
            );
          })}

          <Typography
            sx={{ color: "text.primary" }}
            fontFamily={"Montserrat"}
            fontWeight={500}
          >
            {breadcrumbs?.[breadcrumbs.length - 1]}
          </Typography>
        </Breadcrumbs>
      </Grid>

      {/* Quick Links */}
      <Grid size={{ xs: 12, sm: 6 }} display={"flex"} justifyContent={"end"}>
        <Stack
          direction={"row"}
          alignItems={"center"}
          justifyContent={{ xs: "start", md: "end" }}
          width={"100%"}
        >
          {(allSections.length === 1 || allSections.length === 4) && (
            <SearchBox
              placeholder="Search"
              value={search}
              fullWidth
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
          <Stack direction={"row"} display={{ xs: "none", md: "flex" }}>
            <Tooltip title={"Notifications"} sx={{ ml: 2, width: "55px" }}>
              <IconButton
                onClick={() => {
                  navigator("/notifications");
                }}
              >
                <Badge badgeContent={msgCount} color="primary" max={9}>
                  <NotificationsIcon color="action" sx={{ fontSize: 30 }} />
                </Badge>
              </IconButton>
            </Tooltip>

            <IconMenu />
          </Stack>
        </Stack>
      </Grid>

      {/* Body Section */}
      <Grid
        size={12}
        container
        height={{ xs: "calc(100vh - 170px)", md: "calc(100vh - 165px)" }}
        overflow={"auto"}
        padding={"2px"}
      >
        <Outlet />
      </Grid>
    </Grid>
  );
}

export default DashboardArea;
