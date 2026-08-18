import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { searchHospitals } from "./hospitals.server";

export const findHospitals = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        radius: z.number().min(500).max(50000),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    searchHospitals(data.latitude, data.longitude, data.radius),
  );
